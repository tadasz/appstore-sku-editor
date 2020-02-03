import { Page } from 'puppeteer';

import { RawInAppPurchasePricing } from '../../models/InAppPurchase';
import { formatCurrency, formatPrice, formatRegion } from '../../util/string';

// Helpers

const mapInAppPurchasesData = (items: RawInAppPurchasePricing[]) => {
  return items.map(item => ({
    region: formatRegion(item.regionDescriptor),
    currency: formatCurrency(item.regionDescriptor),
    price: formatPrice(item.price),
  }));
};

// Handlers

const handleNoPriceChanges = async (page: Page) => {
  // Click on `Current Price`
  await page.evaluate(() => {
    const currentPriceButton = Array.from(
      document.querySelectorAll('a')
    ).filter(a => a.textContent?.includes('Current Price'))[0];

    currentPriceButton.click();
  });

  // Find the table element
  const data = await page.evaluate(() => {
    const title = document.querySelectorAll(
      `h1[ng-bind-html="l10n.interpolate('ITC.apps.iap.20.ProceedsByTerritory.titleCurrent')"]`
    )[0];

    const parent = title.parentElement;

    const allChildren = Array.from(parent!.children);

    const tableContainer = allChildren.find(
      el => el.className === 'fixedTableWrapper'
    );

    const table = Array.from(tableContainer!.children).find(
      el => el.tagName === 'TABLE'
    );

    // Iterate through the table
    const ths = Array.from(table!.querySelectorAll('th'));
    const headers = ths.map((_, i) => {
      switch (i) {
        case 0: {
          return 'regionDescriptor';
        }
        case 1: {
          return 'price';
        }
        case 2: {
          return 'priceAfterYear1';
        }
        case 3: {
          return 'priceAfterYear2';
        }
        default: {
          return 'unknown';
        }
      }
    });

    const trs = Array.from(
      document.querySelectorAll(
        'tr[ng-repeat="terr in pricingDisplay[tempPageContent.proceedsModalDate].value"]'
      )
    );

    let results = [] as RawInAppPurchasePricing[];

    trs.forEach(tr => {
      let r = {} as RawInAppPurchasePricing;
      let tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText);

      headers.forEach((k, i) => ((r as any)[k] = tds[i]));
      results.push(r);
    });

    return results;
  });

  const formattedData = mapInAppPurchasesData(data);

  return formattedData;
};

export { handleNoPriceChanges };
import { Page } from 'puppeteer';
import { logger } from '../../../util/terminal';

import {
  MappedInAppPurchase,
  RawInAppPurchase,
  InAppPurchaseType,
  InAppPurchaseStatus,
} from '../models/InAppPurchase';

// Helpers
const parseInAppPurchasesTable = async (page: Page) => {
  console.log('parseInAppTable 0 0');
  const data = await page.evaluate(() => {
    console.log('evaluate 0');
    // Headers
    const ths = Array.from(document.querySelectorAll('table'));
    const headers = ths.map(th => (th as HTMLElement).innerText);

    console.log('evaluate 1');

    // Rows
    const trs = Array.from(
      document.querySelectorAll(
        'table tr[ng-repeat="iap in filteredIaps track by $index"]'
      )
    );
    console.log('evaluate 2');
    let results = [] as RawInAppPurchase[];

    trs.forEach(tr => {
      console.log('evaluate 2.1');
      let r = {} as RawInAppPurchase;

      let tds = Array.from(tr.querySelectorAll('td')).map(td => {
        const children = Array.from(td.children);
        const firstElement = children[0] as HTMLAnchorElement;

        if (children.length === 2 && firstElement.tagName === 'A') {
          return {
            name: firstElement.text,
            url: firstElement.href,
          };
        } else {
          return td.innerText;
        }
      });

      headers.forEach((k, i) => {
        (r as any)[k] = tds[i];
      });

      results.push(r);
    });
    console.log('parseInAppTable 3');
    return results;
  });

  console.log('returning parseInAppPurchasesTable');
  return data as RawInAppPurchase[];
};

const mapInAppPurchasesTable = (
  items: RawInAppPurchase[]
): MappedInAppPurchase[] => {
  return items.map(item => ({
    name: item['Reference Name'].name,
    id: item['Product ID'],
    type: item.Type,
    status: item.Status,
    url: item['Reference Name'].url,
  }));
};

const filterInAppPurchasesTable = (items: MappedInAppPurchase[]) => {
  return items
    .filter(item => item.type !== InAppPurchaseType.consumable)
    .filter(item => item.status !== InAppPurchaseStatus.removed);
};

// Task
const parseIAPs = async (page: Page) => {
  logger.info('parseIAPs 0');
  // await page.waitForSelector('table th.sort-asc');
  await page.waitForSelector('iframe');
  await page.waitFor(10000); //wait 10 seconds

  // const elementHandle = await page.$('div#disneyid-wrapper iframe');
  findInFrames(page, 'table');
  logger.info('parseIAPs 1');

  const rawData = await parseInAppPurchasesTable(page);
  logger.info('parseIAPs 2');
  const mappedData = mapInAppPurchasesTable(rawData);
  logger.info('parseIAPs 3');
  const filteredData = filterInAppPurchasesTable(mappedData);
  logger.info('parseIAPs 4');
  return filteredData;
};

async function recursiveFindInFrames(inputFrame: any, selector: any) {
  const frames = inputFrame.childFrames();
  const results = await Promise.all(
    frames.map(async (frame: any) => {
      const el = await frame.$(selector);
      if (el) return el;
      if (frame.childFrames().length > 0) {
        return await recursiveFindInFrames(frame, selector);
      }
      return null;
    })
  );
  return results.find(Boolean);
}
async function findInFrames(page: any, selector: any) {
  const result = await recursiveFindInFrames(page.mainFrame(), selector);
  if (!result) {
    throw new Error(
      `The selector \`${selector}\` could not be found in any child frames.`
    );
  }
  return result;
}

export { parseIAPs };

const path = require('path')
const fsPromises = require('fs/promises')
const puppeteer = require('puppeteer')
const fetch = require('node-fetch')

class Main {
  async run () {
    const browser = await puppeteer.launch()

    try {
      const page = await browser.newPage()

      await page.setViewport({width: 800, height: 1050, deviceScaleFactor: 2})

      const items = await this.getItems()

      for (const [pathname, file] of items) {
        const dirname = path.join(__dirname, '../dist/img')
        const destination = path.join(dirname, file + '.png')

        await fsPromises.mkdir(path.dirname(destination), {recursive: true})
        await page.goto('http://127.0.0.1:3000' + pathname)
        await new Promise(resolve => setTimeout(resolve, 200))
        await page.screenshot({path: destination})
      }
    } finally {
      await browser.close()
    }
  }

  async getItems () {
    const baseUrl = 'http://127.0.0.1:3000'
    const url = `${baseUrl}/api/v1/document/document-1/request/submit`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        form: {
          name: '氏名',
          email: 'メールアドレス',
          subscribe: '受け取る',
        },
      }),
    })

    const body = await response.json()
    const {search} = new URL(body.redirect, baseUrl)

    return [
      ['/', 'static-page/public-home'],
      ['/layout/', 'static-page/public-layout'],
      ['/serial/tutorial/', 'serial/public-index'],
      ['/serial/tutorial/tutorial-serial-1/', 'serial/public-view'],
      ['/serial/tutorial/tutorial-serial-1/tutorial-serial-1-article-1/', 'serial/public-article'],
      ['/column/', 'column/public-index'],
      ['/column/column-article-1/', 'column/public-view'],
      ['/document/', 'document/public-index'],
      ['/document/document-1/', 'document/public-view'],
      ['/document/document-1/request/', 'document/public-request'],
      ['/document/document-1/request/finish/' + search, 'document/public-request-finish'],
      ['/document/document-1/request/expired/', 'document/public-request-expired'],
      ['/unsubscribe/', 'static-page/public-unsubscribe'],
      ['/unsubscribe/finish/', 'static-page/public-unsubscribe-finish'],
      ['/error/404/', 'error/404'],
    ]
  }
}

if (require.main === module) {
  main()
}

async function main () {
  try {
    await new Main().run()
  } catch (err) {
    console.error(err.message)
    console.debug(err.stack)
  }
}

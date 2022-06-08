const path = require('path')
const fsPromises = require('fs/promises')
const winston = require('winston')
const model = require('../model')
const {LoggerMaker} = require('../util/LoggerMaker')

class Main {
  async run () {
    const loggerMaker = new LoggerMaker()

    winston.loggers.add('query', loggerMaker.makeLogger('info', 'raw', 'fixture-query.log'))

    try {
      const skeleton = process.env.BASE_URL + '/static/img/skeleton.png'
      await model.sequelize.sync({force: true})

      await model.publicFile.create({
        code: 'document/document-1-sample.pdf',
        title: 'ここに公開ファイルのタイトルが入ります',
        description: '\nここに公開ファイルの説明が入ります。'.repeat(3).slice(1),
        location: `gs://${process.env.BUCKET_PUBLIC}/document/document-1/sample.pdf`,
      })

      await model.privateFile.create({
        code: 'document/document-1.pdf',
        title: 'ここに公開ファイルのタイトルが入ります',
        description: '\nここに公開ファイルの説明が入ります。'.repeat(3).slice(1),
        location: `gs://${process.env.BUCKET_PRIVATE}/document/document-1.pdf`,
      })

      await model.description.create({
        subject: `${process.env.BASE_URL}/`,
        predicate: 'http://purl.org/dc/elements/1.1/title',
        object: '技術ブログ配信システム',
      })

      await model.description.create({
        subject: `${process.env.BASE_URL}/`,
        predicate: 'http://purl.org/dc/elements/1.1/description',
        object: 'ここにサイトの説明が入ります',
      })

      await model.description.create({
        subject: `${process.env.BASE_URL}/`,
        predicate: 'https://ogp.me/ns#image',
        object: skeleton,
      })

      await model.user.create({
        email: process.env.USER_EMAIL,
      })

      const email = await model.email.create({
        date: new Date('2021-12-30T00:00:00Z'),
        fromName: 'ここに差出人が入ります',
        fromEmail: 'from@loremipsum.co.jp',
        toName: 'ここに宛先が入ります',
        toEmail: 'to@loremipsum.co.jp',
        subject: 'ここに件名が入ります',
        content: 'ここに本文が入ります' + '\nここに本文が入ります'.repeat(2),
        isSent: false,
        errorCount: 1,
        errorMessage: 'ここにエラーメッセージが入ります',
        errorStack: 'ここにスタックトレースが入ります' + '\nここにスタックトレースが入ります'.repeat(2),
      })

      const author = await model.author.create({
        code: 'susukida',
        name: '薄田 達哉',
        kana: 'ススキダタツヤ',
        roman: 'Tatsuya Susukida',
        url: 'https://www.loremipsum.co.jp/',
        visual: skeleton,
        profile: 'ここに自己紹介が入ります。'.repeat(5),
      })

      const document = await model.document.create({
        code: 'document-1',
        title: 'ここにダウンロード資料のタイトルが入ります1',
        titleShort: 'ダウンロード資料1',
        visual: skeleton,
        date: '2021-12-01',
        description: 'ここに導入テキストが入ります。'.repeat(5),
        file: `gs://${process.env.BUCKET_PRIVATE}/document/document-1.pdf`,
        sample: `gs://${process.env.BUCKET_PUBLIC}/document/document-1/sample.pdf`,
        page: '50',
        isPublished: true,
      })

      for (let i = 1; i <= 3; i += 1) {
        const documentSection = await model.documentSection.create({
          sort: i,
          title: `ここに見出しが入ります${i}`,
          documentId: document.id,
        })

        for (let j = 1; j <= 3; j += 1) {
          await model.documentSubsection.create({
            sort: j,
            title: `ここにこ見出しが入ります${j}`,
            documentSectionId: documentSection.id,
          })
        }
      }

      const categoryTutorial = await model.category.create({
        sort: 1,
        code: 'tutorial',
        title: 'チュートリアル',
      })

      const categoryWork = await model.category.create({
        sort: 2,
        code: 'work',
        title: '開発事例',
      })

      const categories = [categoryTutorial, categoryWork]

      for (const category of categories) {
        const i = categories.indexOf(category) + 1

        for (let j = 1; j <= 3; j += 1) {
          const serial = await model.serial.create({
            code: `${category.code}-serial-${j}`,
            title: `ここに${category.title}シリーズ${j}のタイトルが入ります`,
            titleShort: `${category.title}${j}`,
            visual: skeleton,
            isPublished: true,
          })

          await model.categorySerial.create({
            sort: j,
            categoryId: category.id,
            serialId: serial.id,
          })

          const articles = []

          for (let k = 1; k <= 3; k += 1) {
            const article = await model.article.create({
              code: `${category.code}-serial-${j}-article-${k}`,
              title: `ここに${category.title}シリーズ${j}の記事${k}のタイトルが入ります`,
              titleShort: `${category.title}${j}の記事${k}`,
              visual: skeleton,
              date: '2021-12-0' + k,
              description: 'ここに導入テキストが入ります。'.repeat(5),
              body: await this.getArticleBody('sample'),
              minute: '10',
              isPublished: true,
            })

            await model.serialArticle.create({
              sort: k,
              serialId: serial.id,
              articleId: article.id,
            })

            await model.articleDocument.create({
              articleId: article.id,
              documentId: document.id,
            })

            await this.createArticleSections(article)

            await model.authorArticle.create({
              authorId: author.id,
              articleId: article.id,
            })

            if (i === 1) {
              await model.documentArticle.create({
                sort: 3 * 3 * (i - 1) + 3 * (j - 1) + k,
                documentId: document.id,
                articleId: article.id,
              })
            }

            articles.push(article)
          }

          for (const articleFrom of articles) {
            for (const articleTo of articles) {
              if (articleFrom.id != articleTo.id) {
                await model.articleArticle.create({
                  sort: articles.indexOf(articleTo) + 1,
                  articleFromId: articleFrom.id,
                  articleToId: articleTo.id,
                })
              }
            }
          }
        }
      }

      const topics = []

      for (let i = 1; i <= 8; i += 1) {
        const topic = await model.topic.create({
          sort: i,
          code: `topic-${i}`,
          title: `トピック${i}`,
        })

        topics.push(topic)
      }

      const articles = []

      for (let i = 1; i <= 9; i += 1) {
        const article = await model.article.create({
          code: `column-article-${i}`,
          title: `ここにコラム記事${i}のタイトルが入ります`,
          titleShort: `コラム記事${i}`,
          visual: skeleton,
          date: '2021-12-0' + i,
          description: 'ここに導入テキストが入ります。'.repeat(5),
          body: await this.getArticleBody('sample'),
          minute: '10',
          isPublished: true,
        })

        for (let j = 0; j < 3; j += 1) {
          const topic = topics[(i + j - 1) % topics.length]

          await model.topicArticle.create({
            sort: j + 1,
            topicId: topic.id,
            articleId: article.id,
          })
        }

        await model.articleDocument.create({
          articleId: article.id,
          documentId: document.id,
        })

        await this.createArticleSections(article)

        await model.authorArticle.create({
          authorId: author.id,
          articleId: article.id,
        })

        articles.push(article)
      }

      for (let i = 0; i < articles.length; i += 1) {
        for (let j = 1; j <= 3; j += 1) {
          const articleFrom = articles[i]
          const articleTo = articles[(i + j) % articles.length]

          await model.articleArticle.create({
            sort: j,
            articleFromId: articleFrom.id,
            articleToId: articleTo.id,
          })
        }
      }

      await model.emailTemplate.create({
        sort: 1,
        code: 'document-request',
        title: 'ダウンロード資料のお申し込み完了',
        fromName: 'ここにサイト名が入ります',
        fromEmail: 'blog@loremipsum.co.jp',
        toName: '{{{request.name}}} 様',
        toEmail: '{{{request.email}}}',
        subject: 'ダウンロードURLのお知らせ｜{{{document.title}}}',
        content: [
          "{{{request.name}}} 様",
          "",
          "株式会社ロレムイプサムの薄田達哉と申します。",
          "この度は技術ブログよりお問い合わせをいただきまして誠にありがとうございます。",
          "",
          "お申し込みいただいた資料のダウンロードURLを下記の通りお知らせいたします。",
          "なお、ダウンロードURLの有効期間は発行から24時間です。",
          "",
          "- 資料名: {{{document.title}}}",
          "- ダウンロードURL: {{{urlDownload}}}",
          "",
          "メールマガジンの配信（無料）については「{{{request.subscribe}}}」にて承りました。",
          "{{#isSubscribed}}配信停止をご希望の場合、下記URLよりお手続きください。",
          "",
          "- URL: {{{urlUnsubscribe}}}",
          "{{/isSubscribed}}",
          "",
          "Webシステム開発でお手伝いできることがありましたら、",
          "本メール返信やお問い合わせフォームなどからお気軽にお問い合わせください。",
          "",
          "-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-",
          "　株式会社ロレムイプサム",
          "　代表取締役　　薄田　達哉",
          "",
          "　〒940-2039",
          "　新潟県長岡市関原南4丁目3934番地",
          "　Tel：0258-94-5233　　Fax：0258-94-5541",
          "　E-mail：susukida@loremipsum.co.jp",
          "　Web：https://www.loremipsum.co.jp/",
          "-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-",
          "",
        ].join('\n'),
      })
    } finally {
      model.sequelize.close()
    }
  }

  async getArticleBody (filename) {
    if (!filename) {
      throw new TypeError(`!filename: ${filename}`)
    }

    const source = path.join(__dirname, `../article/${filename}.html`)
    const buffer = await fsPromises.readFile(source)

    return buffer.toString()
  }

  async createArticleSections (article) {
    await model.articleSection.create({
      sort: 1,
      title: `この記事のポイント`,
      url: `#section-1`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 2,
      title: `ここに見出しが入ります1`,
      url: `#section-2`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 3,
      title: `ここに見出しが入ります2`,
      url: `#section-3`,
      articleId: article.id,
    })

    await model.articleSection.create({
      sort: 4,
      title: `まとめ`,
      url: `#section-4`,
      articleId: article.id,
    })
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

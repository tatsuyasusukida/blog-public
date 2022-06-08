const path = require('path')
const crypto = require('crypto')
const helmet = require('helmet')
const morgan = require('morgan')
const express = require('express')
const nocache = require('nocache')
const winston = require('winston')
const Mustache = require('mustache')
const sgMail = require('@sendgrid/mail')
const basicAuth = require('basic-auth-connect')
const proxyMiddleware = require('proxy-middleware')
const model = require('./model')
const {Storage} = require('@google-cloud/storage')
const {Initializer} = require('./lib/Initializer')
const {Validator} = require('./lib/Validator')
const {Converter} = require('./lib/Converter')
const {QueryTypes, Op} = model.Sequelize

class App {
  constructor () {
    this.initializer = new Initializer()
    this.validator = new Validator()
    this.converter = new Converter()

    this.router = express()
    this.router.set('strict routing', true)
    this.router.set('view engine', 'pug')
    this.router.set('views', path.join(__dirname, 'view'))
    this.router.use(this.onRequestInitialize.bind(this))
    this.router.use((req, res, next) => {
      helmet({
        contentSecurityPolicy: {
          directives: {
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "block-all-mixed-content": [],
            "font-src": ["'self'", "https:", "data:"],
            "frame-ancestors": ["'self'"],
            "img-src": ["'self'", "https:", "data:"],
            "object-src": ["'none'"],
            "script-src": [
              "'self'",
              "https://www.google-analytics.com",
              "https://ssl.google-analytics.com",
              "https://www.googletagmanager.com",
            ].concat(res.locals.layout && res.locals.layout.nonce
              ? [`'nonce-${res.locals.layout.nonce}'`]
              : []),
            "script-src-attr": ["'none'"],
            "style-src": ["'self'", "https:", "'unsafe-inline'"],
            "upgrade-insecure-requests": [],
            "connect-src": ["'self'", "https://www.google-analytics.com"],
          },
        },
      })(req, res, next)
    })

    this.router.use(morgan(process.env.LOG_ACCESS, {
      stream: {
        write (message) {
          winston.loggers.get('access').info(message.trim())
        },
      },
    }))

    if (process.env.BASIC_AUTH_IS_ENABLED === '1') {
      const username = process.env.BASIC_AUTH_USERNAME
      const password = process.env.BASIC_AUTH_PASSWORD

      this.router.use(basicAuth(username, password))
    }

    if (process.env.PROXY === '1') {
      this.router.use('/static/', proxyMiddleware('http://127.0.0.1:8080'))
    } else {
      this.router.use('/static/', express.static(path.join(__dirname, 'static')))
    }

    this.router.get('/', this.onRequestStaticPagePublicHome.bind(this))
    this.router.get('/', (req, res) => res.render('static-page/public-home'))
    this.router.get('/layout/', (req, res) => res.render('static-page/public-layout'))
    this.router.use('/serial/:categoryCode([0-9a-z-]+)/', this.onRequestFindCategory.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/', this.onRequestSerialPublicIndex.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/', (req, res) => res.render('serial/public-index'))
    this.router.use('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/', this.onRequestFindSerial.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/', this.onRequestSerialPublicView.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/', (req, res) => res.render('serial/public-view'))
    this.router.use('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/:articleCode([0-9a-z-]+)/', this.onRequestFindSerialArticle.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/:articleCode([0-9a-z-]+)/', this.onRequestSerialPublicArticle.bind(this))
    this.router.get('/serial/:categoryCode([0-9a-z-]+)/:serialCode([0-9a-z-]+)/:articleCode([0-9a-z-]+)/', (req, res) => res.render('serial/public-article'))
    this.router.get('/column/', this.onRequestColumnPublicIndex.bind(this))
    this.router.get('/column/', (req, res) => res.render('column/public-index'))
    this.router.use('/column/:articleCode([0-9a-z-]+)/', this.onRequestFindColumnArticle.bind(this))
    this.router.get('/column/:articleCode([0-9a-z-]+)/', this.onRequestColumnPublicView.bind(this))
    this.router.get('/column/:articleCode([0-9a-z-]+)/', (req, res) => res.render('column/public-view'))
    this.router.get('/document/', this.onRequestDocumentPublicIndex.bind(this))
    this.router.get('/document/', (req, res) => res.render('document/public-index'))
    this.router.use('/document/:documentCode([0-9a-z-]+)/', this.onRequestFindDocument.bind(this))
    this.router.use('/document/:documentCode([0-9a-z-]+)/', this.onRequestDocumentPublicView.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/', (req, res) => res.render('document/public-view'))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/', this.onRequestDocumentPublicRequest.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/', (req, res) => res.render('document/public-request'))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/finish/', this.onRequestFindRequest.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/finish/', this.onRequestDocumentPublicRequestFinish.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/finish/', (req, res) => res.render('document/public-request-finish'))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/expired/', this.onRequestDocumentPublicRequestExpired.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/request/expired/', (req, res) => res.render('document/public-request-expired'))
    this.router.get('/document/:documentCode([0-9a-z-]+)/download/file/', this.onRequestFindRequest.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/download/file/', this.onRequestDocumentPublicDownloadFile.bind(this))
    this.router.get('/document/:documentCode([0-9a-z-]+)/download/sample/', this.onRequestDocumentPublicDownloadSample.bind(this))
    this.router.get('/unsubscribe/', (req, res) => res.render('static-page/public-unsubscribe'))
    this.router.get('/unsubscribe/finish/', (req, res) => res.render('static-page/public-unsubscribe-finish'))
    this.router.get('/error/404/', (req, res) => res.render('error/404'))

    this.router.use('/api/v1/', nocache())
    this.router.use('/api/v1/', express.json())
    this.router.use('/api/v1/document/:documentCode([0-9a-z-]+)/', this.onRequestFindDocument.bind(this))
    this.router.get('/api/v1/document/:documentCode([0-9a-z-]+)/request/initialize', this.onRequestApiV1DocumentRequestInitialize.bind(this))
    this.router.post('/api/v1/document/:documentCode([0-9a-z-]+)/request/validate', this.onRequestApiV1DocumentRequestValidate.bind(this))
    this.router.post('/api/v1/document/:documentCode([0-9a-z-]+)/request/submit', this.onRequestApiV1DocumentRequestSubmit.bind(this))
    this.router.get('/api/v1/unsubscribe/initialize', this.onRequestApiV1UnsubscribeInitialize.bind(this))
    this.router.post('/api/v1/unsubscribe/validate', this.onRequestApiV1UnsubscribeValidate.bind(this))
    this.router.post('/api/v1/unsubscribe/submit', this.onRequestApiV1UnsubscribeSubmit.bind(this))

    this.router.use(this.onRequestNotFound.bind(this))
    this.router.use(this.onRequestInternalServerError.bind(this))
  }

  onListening () {
    winston.loggers.get('info').info(`Listening on ${process.env.PORT}`)
  }

  onRequest (req, res) {
    this.router(req, res)
  }

  async onRequestInitialize (req, res, next) {
    try {
      req.locals = {}

      const url = new URL(req.originalUrl, process.env.BASE_URL)

      if (new RegExp('^/static').test(url.pathname)) {
        next()
        return
      }

      if (new RegExp('^/api').test(url.pathname)) {
        next()
        return
      }

      const descriptions = await model.description.findAll({
        where: {
          subject: {[Op.eq]: `${process.env.BASE_URL}/`}
        },
      })

      const dc = 'http://purl.org/dc/elements/1.1/'
      const og = 'https://ogp.me/ns#'
      const [dcTitle] = descriptions.filter(description => {
        return description.predicate === `${dc}title`
      })

      const [dcDescription] = descriptions.filter(description => {
        return description.predicate === `${dc}description`
      })

      const [ogTitle] = descriptions.filter(description => {
        return description.predicate === `${og}title`
      })

      const [ogDescription] = descriptions.filter(description => {
        return description.predicate === `${og}description`
      })

      const [ogImage] = descriptions.filter(description => {
        return description.predicate === `${og}image`
      })

      const websiteDcTitle = dcTitle ? dcTitle.object : 'ここにサイト名が入ります'
      const websiteDcDescription = dcDescription ? dcDescription.object : 'ここにサイトの説明が入ります'
      const websiteOgTitle = ogTitle ? ogTitle.object : websiteDcTitle
      const websiteOgDescription = ogDescription ? ogDescription.object : websiteDcDescription
      const websiteOgImage = ogImage ? ogImage.object : `${process.env.BASE_URL}/static/img/logo.png`

      const website = {
        dc: {
          title: websiteDcTitle,
          description: websiteDcDescription,
        },
        og: {
          title: websiteOgTitle,
          description: websiteOgDescription,
          image: websiteOgImage,
        },
      }

      const categories = await model.category.findAll({
        order: [['sort', 'asc']],
      })

      req.locals.website = website
      req.locals.categories = categories

      res.locals.layout = {
        env: process.env,
        nonce: crypto.randomBytes(16).toString('hex'),
        url,
        website,
        categories,
      }

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindCategory (req, res, next) {
    try {
      const [category] = req.locals.categories.filter(category => {
        return category.code === req.params.categoryCode
      })

      if (!category) {
        this.onRequestNotFound(req, res)
        return
      }

      req.locals.category = category

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindSerial (req, res, next) {
    try {
      const {category} = req.locals
      const {serialCode} = req.params
      const serial = await this.findSerial(category, serialCode)

      if (!serial) {
        this.onRequestNotFound(req, res)
        return
      }

      req.locals.serial = serial

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindSerialArticle (req, res, next) {
    try {
      const {category, serial} = req.locals
      const {articleCode} = req.params
      const article = await this.findSerialArticle(category, serial, articleCode)

      if (!article) {
        this.onRequestNotFound(req, res)
        return
      }

      req.locals.article = article
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindColumnArticle (req, res, next) {
    try {
      const isStaging = process.env.APP_IS_STAGING === '1'
      const article = await model.article.findOne({
        where: {
          code: {[Op.eq]: req.params.articleCode},
          ...(isStaging ? {} : {isPublished: {[Op.eq]: true}}),
        },
      })

      if (!article) {
        this.onRequestNotFound(req, res)
        return
      }

      req.locals.article = article
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindDocument (req, res, next) {
    try {
      const isStaging = process.env.APP_IS_STAGING === '1'
      const document = await model.document.findOne({
        where: {
          code: {[Op.eq]: req.params.documentCode},
          ...(isStaging ? {} : {isPublished: {[Op.eq]: true}}),
        },
      })

      if (!document) {
        this.onRequestNotFound(req, res)
        return
      }

      req.locals.document = document

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestStaticPagePublicHome (req, res, next) {
    try {
      const categories = []

      for (const category of req.locals.categories) {
        const limit = 3
        const serials = await this.findSerials(category, limit)

        categories.push({
          code: category.code,
          title: category.title,
          serials: serials,
        })
      }

      const articles = await this.findColumnArticles(null, 3)
      const documents = await this.findDocuments(3)

      res.locals.categories = categories
      res.locals.articles = articles
      res.locals.documents = documents

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestSerialPublicIndex (req, res, next) {
    try {
      const {category} = req.locals
      const serials = await this.findSerials(category)

      res.locals.category = category
      res.locals.serials = serials

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestSerialPublicView (req, res, next) {
    try {
      const {category, serial} = req.locals
      const articles = await this.findSerialArticles(serial)

      res.locals.category = category
      res.locals.serial = serial
      res.locals.articles = articles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestSerialPublicArticle (req, res, next) {
    try {
      const {category, serial, article} = req.locals
      const articleSections = await this.findArticleSections(article)
      const document = await this.findRelatedDocument(article)
      const author = await this.findAuthor(article)
      const recommendedArticles = await this.findRecommendedArticles(article.id)
      const serialArticles = (await model.serialArticle.findAll({
          where: {
            serialId: {[Op.eq]: serial.id},
          },
          include: [
            {
              model: model.article,
              as: 'article',
              attributes: ['id', 'code', 'title', 'titleShort', 'isPublished'],
            },
          ],
          order: [['sort', 'asc']],
        }))
        .filter(serialArticle => {
          if (process.env.APP_IS_STAGING === '1') {
            return true
          } else {
            return serialArticle.article.isPublished
          }
        })
        .map(serialArticle => serialArticle.article)

      const index = serialArticles.findIndex(serialArticle => {
        return serialArticle.id === article.id
      })

      const articlePrevious = index >= 1 ? serialArticles[index - 1] : null
      const articleNext = index < serialArticles.length - 1 ? serialArticles[index + 1] : null
      const metadata = this.makeMetadata(req, article, author)

      res.locals.category = category
      res.locals.serial = serial
      res.locals.article = this.converter.convertArticle(article)
      res.locals.articleSections = articleSections
      res.locals.document = document
      res.locals.author = author
      res.locals.recommendedArticles = recommendedArticles
      res.locals.serialArticles = serialArticles
      res.locals.articlePrevious = articlePrevious
      res.locals.articleNext = articleNext
      res.locals.metadata = JSON.stringify(metadata)

      next()
    } catch (err) {
      next(err)
    }
  }

  makeMetadata (req, article, author) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': new URL(req.originalUrl, process.env.BASE_URL).toString(),
      },
      'headline': article.title,
      'image': [
        new URL(article.visual, process.env.BASE_URL).toString(),
      ],
      'datePublished': article.date,
      'author': {
        '@type': 'Person',
        'name': author.name,
        'url': author.url,
      },
      'publisher': {
        '@type': 'Organization',
        'name': '株式会社ロレムイプサム',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://www.loremipsum.co.jp/static/img/logo.png',
        },
      },
    }
  }

  async onRequestColumnPublicIndex (req, res, next) {
    try {
      const topics = await model.topic.findAll({
        order: [['sort', 'asc']],
      })

      const topicCode = req.query.topic || null
      const topic = topicCode && (topics.find(topic => {
        return topic.code === topicCode
      }) || null)

      const articles = await this.findColumnArticles(topic)

      res.locals.topic = topic
      res.locals.topics = topics
      res.locals.articles = articles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestColumnPublicView (req, res, next) {
    try {
      const {article} = req.locals
      const articleSections = await this.findArticleSections(article)
      const document = await this.findRelatedDocument(article)
      const author = await this.findAuthor(article)
      const recommendedArticles = await this.findRecommendedArticles(article.id)
      const topics = (await model.topicArticle.findAll({
          where: {
            articleId: {[Op.eq]: article.id},
          },
          include: [{model: model.topic, as: 'topic'}],
          order: [['sort', 'asc']],
        }))
        .map(topicArticle => topicArticle.topic)

      const metadata = this.makeMetadata(req, article, author)

      res.locals.article = this.converter.convertArticle(article)
      res.locals.articleSections = articleSections
      res.locals.document = document
      res.locals.author = author
      res.locals.recommendedArticles = recommendedArticles
      res.locals.topics = topics
      res.locals.metadata = JSON.stringify(metadata)

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestDocumentPublicIndex (req, res, next) {
    try {
      const documents = await this.findDocuments()

      res.locals.documents = documents

      next()
    } catch (err) {
      next(err)
    }
  }

  async findDocuments (limit) {
    const isStaging = process.env.APP_IS_STAGING === '1'
    return (await model.document.findAll({
        where: {
          ...(isStaging ? {} : {isPublished: {[Op.eq]: true}}),
        },
        order: [['date', 'asc']],
        limit,
      }))
      .map(document => this.converter.convertDocument(document))
  }

  async onRequestDocumentPublicView (req, res, next) {
    try {
      const {document} = req.locals
      const documentSections = await this.findDocumentSections(document)
      const recommendedArticles = await this.findRecommendedArticles(document.id, true)

      res.locals.document = this.converter.convertDocument(document)
      res.locals.documentSections = documentSections
      res.locals.recommendedArticles = recommendedArticles

      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestDocumentPublicRequest (req, res, next) {
    try {
      res.locals.document = req.locals.document
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestFindRequest (req, res, next) {
    try {
      const request = await model.request.findOne({
        where: {
          code: {[Op.eq]: req.query.code},
        },
      })

      if (!request) {
        res.status(400).end()
        return
      }

      const requestDocument = await model.requestDocument.findOne({
        where: {
          requestId: {[Op.eq]: request.id},
          documentId: {[Op.eq]: req.locals.document.id},
        },
      })

      if (!request) {
        res.status(400).end()
        return
      }

      req.locals.request = request
      next()
    } catch (err) {
      next(err)
    }
  }

  isRequestExpired (request) {
    const now = new Date().getTime()
    const day = 24 * 60 * 60 * 1000

    return now > request.date.getTime() + 1 * day
  }

  async onRequestDocumentPublicRequestFinish (req, res, next) {
    try {
      if (this.isRequestExpired(req.locals.request)) {
        res.redirect('../expired/')
        return
      }

      res.locals.document = req.locals.document
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestDocumentPublicRequestExpired (req, res, next) {
    try {
      res.locals.document = req.locals.document
      next()
    } catch (err) {
      next(err)
    }
  }

  async onRequestDocumentPublicDownloadFile (req, res, next) {
    try {
      if (this.isRequestExpired(req.locals.request)) {
        res.redirect('../../request/expired/')
        return
      }

      res.redirect(await this.convertSource(res.locals.document.file))
    } catch (err) {
      next(err)
    }
  }

  async onRequestDocumentPublicDownloadSample (req, res, next) {
    try {
      res.redirect(await this.convertSource(res.locals.document.sample))
    } catch (err) {
      next(err)
    }
  }

  async convertSource (source) {
    const url = new URL(source, process.env.BASE_URL)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return source
    } else if (url.protocol === 'gs:') {
      const storage = new Storage()
      const bucket = storage.bucket(url.host)
      const file = bucket.file(url.pathname.slice(1))
      const minute = 60 * 1000
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: new Date().getTime() + 24 * 60 * minute,
      })

      return signedUrl
    } else {
      throw new Error(`invalid url.protocol: ${url.protocol}`)
    }
  }

  async onRequestApiV1DocumentRequestInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormDocumentRequest()
      const validation = this.validator.makeValidationDocumentRequest()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1DocumentRequestValidate (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentRequest(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1DocumentRequestSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateDocumentRequest(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const {document} = req.locals
        const request = await model.request.create({
          date: new Date(),
          name: process.env.IS_DEMO === '1' ? 'ここにお名前が入ります' : req.body.form.name,
          email: process.env.IS_DEMO === '1' ? 'ここにメールアドレスが入ります' : req.body.form.email,
          subscribe: req.body.form.subscribe,
          code: crypto.randomUUID(),
        }, {transaction})

        await model.requestDocument.create({
          requestId: request.id,
          documentId: document.id,
        }, {transaction})

        const emailTemplate = await model.emailTemplate.findOne({
          where: {
            code: {[Op.eq]: 'document-request'},
          },
          transaction,
        })

        const urlDownload = `${process.env.BASE_URL}/document/${document.code}/download/file/?code=` + request.code
        const urlUnsubscribe = `${process.env.BASE_URL}/unsubscribe/`
        const isSubscribed = request.subscribe === '希望する'
        const locals = {document, request, urlDownload, urlUnsubscribe, isSubscribed}
        const email = await model.email.create({
          date: new Date(),
          fromName: Mustache.render(emailTemplate.fromName, locals),
          fromEmail: Mustache.render(emailTemplate.fromEmail, locals),
          toName: Mustache.render(emailTemplate.toName, locals),
          toEmail: Mustache.render(emailTemplate.toEmail, locals),
          subject: Mustache.render(emailTemplate.subject, locals),
          content: Mustache.render(emailTemplate.content, locals),
          isSent: false,
          errorCount: 0,
          errorMessage: '',
          errorStack: '',
        }, {transaction})

        if (process.env.SENDGRID_IS_ENABLED === '1') {
          try {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY)
            await sgMail.send({
              from: {
                name: email.fromName,
                email: email.fromEmail,
              },
              to: {
                name: email.toName,
                email: process.env.IS_DEMO === '1' ? req.body.form.email : email.toEmail,
              },
              subject: email.subject,
              text: email.content,
            })

            email.isSent = true
            await email.save({transaction})
          } catch (err) {
            email.errorCount += 1
            email.errorMessage = err.message
            email.errorStack = err.stack

            await email.save({transaction})
          }
        }

        const ok = true
        const redirect = './finish/?code=' + request.code

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1UnsubscribeInitialize (req, res, next) {
    try {
      const form = this.initializer.makeFormUnsubscribe()
      const validation = this.validator.makeValidationUnsubscribe()

      res.send({form, validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1UnsubscribeValidate (req, res, next) {
    try {
      const validation = await this.validator.validateUnsubscribe(req)
      res.send({validation})
    } catch (err) {
      next(err)
    }
  }

  async onRequestApiV1UnsubscribeSubmit (req, res, next) {
    try {
      const validation = await this.validator.validateUnsubscribe(req)

      if (!validation.ok) {
        res.status(400).end()
        return
      }

      await model.sequelize.transaction(async (transaction) => {
        const unsubscribe = await model.unsubscribe.create({
          date: new Date(),
          email: process.env.IS_DEMO === '1' ? 'ここにメールアドレスが入ります' : req.body.form.email,
        }, {transaction})

        const ok = true
        const redirect = './finish/'

        res.send({ok, redirect})
      })
    } catch (err) {
      next(err)
    }
  }

  async findSerials (category, limit) {
    const sql = `
      select
        serial.code as code,
        serial.title as title,
        serial.visual as visual,
        max(article.date) as date,
        count(article.id) as articleCount
      from blogSerial as serial
      inner join blogCategorySerial as categorySerial on categorySerial.serialId = serial.id
      inner join blogSerialArticle as serialArticle on serialArticle.serialId = serial.id
      inner join blogArticle as article on article.id = serialArticle.articleId
      where categorySerial.categoryId = :categoryId
        and (
          :isStaging = 1
          or (
            serial.isPublished is true
            and article.isPublished is true
          )
        )
      group by serial.id, categorySerial.sort
      order by categorySerial.sort asc
      ${limit ? 'limit :limit' : ''}
    `

    return (await model.sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: {
          categoryId: category.id,
          isStaging: process.env.APP_IS_STAGING === '1' ? 1 : 0,
          ...(limit ? {limit} : {}),
        },
      }))
      .map(serial => {
        serial.dateText = this.converter.convertDate(serial.date)
        return serial
      })
  }

  async findSerial (category, serialCode) {
    const sql = `
      select
        serial.*
      from blogSerial as serial
      inner join blogCategorySerial as categorySerial on categorySerial.serialId = serial.id
      where categorySerial.categoryId = :categoryId
        and serial.code = :serialCode
        and (:isStaging = 1 or serial.isPublished is true)
      limit 1
    `

    const [serial] = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        categoryId: category.id,
        serialCode: serialCode,
        isStaging: process.env.APP_IS_STAGING === '1' ? 1 : 0,
      },
    })

    return serial || null
  }

  async findSerialArticles (serial) {
    const sql = `
      select
        article.id as articleId,
        article.code as articleCode,
        article.title as articleTitle,
        article.titleShort as articleTitleShort,
        articleSection.title as articleSectionTitle
      from blogArticle as article
      inner join blogSerialArticle as serialArticle on serialArticle.articleId = article.id
      left outer join blogArticleSection as articleSection on articleSection.articleId = article.id
      where serialArticle.serialId = :serialId
        and (:isStaging = 1 or article.isPublished is true)
      order by serialArticle.sort asc, articleSection.sort asc
    `

    const rows = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        serialId: serial.id,
        isStaging: process.env.APP_IS_STAGING === '1' ? 1 : 0,
      },
    })

    const partitions = this.partitionBy(row => row.articleId, rows)

    return partitions.map(rows => ({
      id: rows[0].articleId,
      title: rows[0].articleTitle,
      titleShort: rows[0].articleTitleShort,
      code: rows[0].articleCode,
      articleSections: rows.map(row => ({
        title: row.articleSectionTitle
      }))
    }))
  }

  async findColumnArticles (topic, limit) {
    const sql = `
      select
        article.id as articleId,
        article.title as articleTitle,
        article.code as articleCode,
        article.visual as articleVisual,
        article.date as articleDate,
        topic.code as topicCode,
        topic.title as topicTitle
      from blogArticle as article
      inner join blogTopicArticle as topicArticle on topicArticle.articleId = article.id
      inner join blogTopic as topic on topic.id = topicArticle.topicId
      where (
          :isTopicSpecified = 0
          or article.id in (
            select articleId from blogTopicArticle as topicArticle
            where topicId = :topicId
          )
        )
        and (:isStaging = 1 or article.isPublished is true)
      order by article.date desc, article.id asc, topicArticle.sort asc
    `

    const rows = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        isTopicSpecified: topic ? 1 : 0,
        topicId: topic ? topic.id : null,
        isStaging: process.env.APP_IS_STAGING === '1',
      },
    })

    const partitions = this.partitionBy(row => row.articleId, rows)
    const articles = partitions.map(rows => ({
      id: rows[0].articleId,
      title: rows[0].articleTitle,
      code: rows[0].articleCode,
      date: rows[0].articleDate,
      dateText: this.converter.convertDate(rows[0].articleDate),
      visual: rows[0].articleVisual,
      topics: rows.map(row => ({
        code: row.topicCode,
        title: row.topicTitle,
      }))
    }))

    return limit ? articles.slice(0, limit) : articles
  }

  async findDocumentSections (document) {
    const sql = `
      select
        documentSection.id as documentSectionId,
        documentSection.title as documentSectionTitle,
        documentSubsection.title as documentSubsectionTitle
      from blogDocumentSection as documentSection
      left outer join blogDocumentSubsection as documentSubsection on documentSubsection.documentSectionId = documentSection.id
      where documentSection.documentId = :documentId
      order by documentSection.sort asc, documentSubsection.sort asc
    `

    const rows = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {documentId: document.id},
    })

    const partitions = this.partitionBy(row => row.documentSectionId, rows)

    return partitions.map(rows => ({
      title: rows[0].documentSectionTitle,
      documentSubsections: rows.map(row => ({
          title: row.documentSubsectionTitle,
        }))
        .filter(documentSubsection => documentSubsection.title),
    }))
  }

  async findRecommendedArticles (fromId, isDocument) {
    const table = isDocument ? 'blogDocumentArticle' : 'blogArticleArticle'
    const tableAs = isDocument ? 'documentArticle' : 'articleArticle'
    const columnFrom = isDocument ? 'documentId' : 'articleFromId'
    const columnTo = isDocument ? 'articleId' : 'articleToId'

    const sql = `
      select
        article.code as articleCode,
        article.title as articleTitle,
        article.visual as articleVisual,
        serial.code as serialCode,
        category.code as categoryCode
      from blogArticle as article
      inner join ${table} as ${tableAs} on ${tableAs}.${columnTo} = article.id
      left outer join blogSerialArticle as serialArticle on serialArticle.articleId = article.id
      left outer join blogSerial as serial on serial.id = serialArticle.serialId
      left outer join blogCategorySerial as categorySerial on categorySerial.serialId = serial.id
      left outer join blogCategory as category on category.id = categorySerial.categoryId
      where ${tableAs}.${columnFrom} = :fromId
        and (:isStaging = 1 or article.isPublished is true)
        and (
          serial.id is null
          or :isStaging = 1
          or serial.isPublished is true
        )
      order by ${tableAs}.sort asc
    `

    const rows = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        fromId: fromId,
        isStaging: process.env.APP_IS_STAGING === '1' ? 1 : 0,
      },
    })

    return rows.map(row => ({
      title: row.articleTitle,
      visual: row.articleVisual,
      url: row.serialCode && row.categoryCode
        ? `/serial/${row.categoryCode}/${row.serialCode}/${row.articleCode}/`
        : `/column/${row.articleCode}/`
    }))
  }

  async findSerialArticle (category, serial, articleCode) {
    const sql = `
      select
        article.*
      from blogArticle as article
      inner join blogSerialArticle as serialArticle on serialArticle.articleId = article.id
      inner join blogCategorySerial as categorySerial on categorySerial.serialId = serialArticle.serialId
      where categorySerial.categoryId = :categoryId
        and serialArticle.serialId = :serialId
        and article.code = :articleCode
        and (:isStaging = 1 or article.isPublished is true)
      limit 1
    `

    const [article] = await model.sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        categoryId: category.id,
        serialId: serial.id,
        articleCode: articleCode,
        isStaging: process.env.APP_IS_STAGING === '1' ? 1 : 0,
      },
    })

    return article || null
  }

  async findArticleSections (article) {
    return await model.articleSection.findAll({
      where: {
        articleId: {[Op.eq]: article.id},
      },
      order: [['sort', 'asc']],
    })
  }

  async findRelatedDocument (article) {
    const articleDocument = await model.articleDocument.findOne({
      where: {
        articleId: {[Op.eq]: article.id},
      },
      include: [{model: model.document, as: 'document'}],
    })

    if (!articleDocument) {
      return null
    }

    if (process.env.APP_IS_STAGING !== '1') {
      if (!articleDocument.document.isPublished) {
        return null
      } 
    }

    return articleDocument.document
  }

  async findAuthor (article) {
    const authorArticle = await model.authorArticle.findOne({
      where: {
        articleId: {[Op.eq]: article.id},
      },
      include: [{model: model.author, as: 'author'}],
    })

    return authorArticle && authorArticle.author
  }

  partitionBy(f, coll) {
    return this.partitionByAccumulate(f, coll, [])
  }

  partitionByAccumulate(f, coll, acc) {
    if (coll.length === 0) {
      return acc.map(el => el.reverse()).reverse()
    }

    const [head] = coll
    const tail = coll.slice(1)

    if (acc.length === 0 || f(head) !== f(acc[0][0])) {
      acc.unshift([head])
      return this.partitionByAccumulate(f, tail, acc)
    } else {
      acc[0].unshift(head)
      return this.partitionByAccumulate(f, tail, acc)
    }
  }

  onRequestNotFound (req, res) {
    res.status(404).render('error/404')
  }

  onRequestInternalServerError(err, req, res, next) {
    res.status(500).send('500 Internal Server Error')
    this.onError(err)
  }

  onError (err) {
    winston.loggers.get('error').error(err.message)
    winston.loggers.get('debug').debug(err.stack)
  }
}

module.exports.App = App

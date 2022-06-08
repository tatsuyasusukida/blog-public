class Converter {
  convertDate (str) {
    const pieces = str.split('-')
    const year = parseInt(pieces[0], 10)
    const month = parseInt(pieces[1], 10)
    const day = parseInt(pieces[2], 10)

    return `${year}年${month}月${day}日`
  }

  convertArticle (article) {
    return {
      id: article.id,
      code: article.code,
      title: article.title,
      titleShort: article.titleShort,
      visual: article.visual,
      date: article.date,
      dateText: this.convertDate(article.date),
      description: article.description,
      body: article.body,
      minute: article.minute,
    }
  }

  convertDocument (document) {
    return {
      id: document.id,
      code: document.code,
      title: document.title,
      titleShort: document.titleShort,
      visual: document.visual,
      date: document.date,
      dateText: this.convertDate(document.date),
      description: document.description,
      file: document.file,
      sample: document.sample,
      page: document.page,
    }
  }
}

module.exports.Converter = Converter

class Initializer {
  makeFormDocumentRequest () {
    return {
      name: '',
      email: '',
      subscribe: '希望する',
    }
  }

  makeFormUnsubscribe () {
    return {
      name: '',
      email: '',
      subscribe: '希望する',
    }
  }
}

module.exports.Initializer = Initializer

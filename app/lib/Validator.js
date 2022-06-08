class Validator {
  makeValidationDocumentRequest () {
    return {
      ok: null,
      name: this.makeValidationFieldNotEmpty(),
      email: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateDocumentRequest (req) {
    const validation = this.makeValidationDocumentRequest()

    validation.name = this.validateFieldNotEmpty(req.body.form.name)
    validation.email = this.validateFieldNotEmpty(req.body.form.email)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationUnsubscribe () {
    return {
      ok: null,
      email: this.makeValidationFieldNotEmpty(),
    }
  }

  async validateUnsubscribe (req) {
    const validation = this.makeValidationUnsubscribe()

    validation.email = this.validateFieldNotEmpty(req.body.form.email)
    validation.ok = this.isValidRequest(validation)

    return validation
  }

  makeValidationFieldNotEmpty () {
    return {
      ok: null,
      isNotEmpty: null,
    }
  }

  validateFieldNotEmpty (value) {
    const validationField = this.makeValidationFieldNotEmpty()

    validationField.isNotEmpty = value !== ''
    validationField.ok = this.isValidField(validationField)

    return validationField
  }

  isValidRequest (validation) {
    return Object.keys(validation).every(key => {
      return key === 'ok' || validation[key].ok
    })
  }

  isValidField (validationField) {
    return Object.keys(validationField).every(key => {
      return key === 'ok' || validationField[key]
    })
  }
}

module.exports.Validator = Validator

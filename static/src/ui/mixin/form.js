export default {
  data () {
    return {
      api: `/api/v1${window.location.pathname}`,
      body: null,
    }
  },

  methods: {
    async initialize () {
      const url = this.api + 'initialize'
      const response = await fetch(url)
      const body = await response.json()

      this.body = body
    },

    async onClickButtonSubmit () {
      try {
        const url = this.api + 'validate'
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({form: this.body.form}),
        }

        const response = await fetch(url, options)
        const body = await response.json()

        this.body.validation = body.validation

        if (body.validation.ok) {
          const url = this.api + 'submit'
          const response = await fetch(url, options)
          const body = await response.json()

          if (body.ok) {
            window.location.assign(body.redirect)
            return
          }
        }
      } catch (err) {
        this.onError(err)
      }
    },

    onError (err) {
      console.error(err.message)
      console.debug(err.stack)
    },
  },
}

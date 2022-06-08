import DocumentPublicRequest from './ui/document/public-request.vue'
import StaticPagePublicUnsubscribe from './ui/static-page/public-unsubscribe.vue'

class Main {
  async run () {
    const options = this.getVueOptions(window.location.pathname)

    if (options) {
      const vm = new Vue(options)

      if (vm.initialize) {
        await vm.initialize()
      }

      vm.$mount('#main')
    }
  }

  getVueOptions (pathname) {
    if (new RegExp('^/document/[0-9a-z-]+/request/$').test(pathname)) {
      return DocumentPublicRequest
    } else if (new RegExp('^/unsubscribe/$').test(pathname)) {
      return StaticPagePublicUnsubscribe
    } else {
      return null
    }
  }
}

async function main () {
  try {
    await new Main().run()
  } catch (err) {
    console.error(err.message)
    console.debug(err.stack)
  }
}

main()

<template lang="pug">
  main
    .bg-light.pt-5.pb-5
      .container
        h1.h4.mb-0 ダウンロード資料のお申し込み
    .container
      .row.justify-content-center
        .col-md-8.col-lg-6
          p.mt-3
            | 資料のダウンロードURLをメールにて送信します。
          form(role='form')
            .form-group.mb-3
              label(for='name') お名前
              input.form-control(id='name' aria-required='true' name='name' type='text' v-model='body.form.name' v-bind:class="{'is-invalid': body.validation.name.ok === false}" v-bind:aria-invalid="body.validation.name.ok === false && true" v-bind:aria-describedby="body.validation.name.ok === false && 'name-validation'")
              p.invalid-feedback(id='name-validation')
                template(v-if='body.validation.name.isNotEmpty === false')
                  | お名前をご入力ください。
            .form-group.mb-3
              label(for='email') メールアドレス
              input.form-control(id='email' aria-required='true' name='email' type='email' v-model='body.form.email' v-bind:class="{'is-invalid': body.validation.email.ok === false}" v-bind:aria-invalid='body.validation.email.ok === false && true' v-bind:aria-describedby="body.validation.email.ok === false && 'email-validation'")
              p#email-validation.invalid-feedback
                template(v-if='body.validation.email.isNotEmpty === false')
                  | メールアドレスをご入力ください。
            fieldset.mb-3
              legend.fs-6 メールマガジンの配信（無料）
              .form-check
                input#subscribe0.form-check-input(aria-describedby='subscribe-memo' checked name='subscribe' type='radio' value='希望する' v-model='body.form.subscribe')
                label.form-check-label(for='subscribe0') 希望する
              .form-check
                input#subscribe1.form-check-input(aria-describedby='subscribe-memo' name='subscribe' type='radio' value='希望しない' v-model='body.form.subscribe')
                label.form-check-label(for='subscribe1') 希望しない
              p.form-text.mb-0(id='subscribe-memo')
                | 新着記事などの情報が1〜2カ月に1回配信されます。
                br
                a(href='../../../unsubscribe/' target='_blank') メールマガジンの配信停止ページ
                | から簡単に停止できます。
            .d-grid
              button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') 登録
</template>

<script>
  import FormMixin from '../mixin/form'

  export default {
    mixins: [FormMixin],
  }
</script>

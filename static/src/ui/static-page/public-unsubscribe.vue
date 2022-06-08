<template lang="pug">
  main
    .bg-light.pt-5.pb-5
      .container
        h1.h4.mb-0 メールマガジンの配信停止
    .container
      .row.justify-content-center
        .col-md-8.col-lg-6
          p.mt-3
            | 配信停止をご希望の方はメールアドレスをご入力の上、配信停止ボタンを押してください。<br>
            | 配信停止ボタンを押すと配信はすぐに停止されます。
          form(role='form')
            .form-group.mb-3
              label(for='email') メールマガジンを受信しているメールアドレス
              input.form-control(id='email' aria-required='true' name='email' type='email' v-model='body.form.email' v-bind:class="{'is-invalid': body.validation.email.ok === false}" v-bind:aria-invalid='body.validation.email.ok === false && true' v-bind:aria-describedby="body.validation.email.ok === false && 'email-validation'")
              p#email-validation.invalid-feedback
                template(v-if='body.validation.email.isNotEmpty === false')
                  | メールマガジンを受信しているメールアドレスをご入力ください。
            .d-grid
              button.btn.btn-primary(type='submit' v-on:click.prevent='onClickButtonSubmit') 配信停止
</template>

<script>
  import FormMixin from '../mixin/form'

  export default {
    mixins: [FormMixin],
  }
</script>

import Vue from 'vue'
import Toasted from 'vue-toasted'
import store from './store'
import './assets/tailwind.css'
import App from './App.vue'
import Keys from '@/components/KeyList/Keys'

Vue.config.productionTip = false

Vue.use(Toasted, {
  duration: 3000,
})

Vue.component('Keys', Keys);

new Vue({
  render: h => h(App),
  store,
}).$mount('#app')

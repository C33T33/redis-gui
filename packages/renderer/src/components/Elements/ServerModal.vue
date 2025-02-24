<script setup lang="ts">
import AppModal from '/@/components/Elements/AppModal.vue'
import { computed, onMounted, ref, watch } from 'vue'
import Button from '/@/components/Elements/Button.vue'
import PrimaryButton from '/@/components/Elements/PrimaryButton.vue'
import type { SshConfig } from 'types/database'
import { useDatabase } from '/@/use/database'
import { useServersStore } from '/@/store/servers'
import { useRedis } from '/@/use/redis'
import { useToaster } from '/@/use/toaster'
import Spinner from '/@/components/Elements/Spinner.vue'

const props = withDefaults(defineProps<{
  serverKey?: string | undefined;
  show?: boolean;
}>(), {
  serverKey: undefined,
  show: true,
})

const emit = defineEmits<{
  (e: 'close'): void;
}>()

const isTesting = ref(false)
const name = ref('')
const host = ref('')
const port = ref(6379)
const path = ref<string | undefined>(undefined)
const url = ref<string | undefined>(undefined)
const ssl = ref<boolean>(false)
const username = ref<string | undefined>(undefined)
const password = ref<string | undefined>(undefined)
const ssh = ref<SshConfig>({
  tunnel: false,
  host: '',
  port: 22,
  user: undefined,
  password: undefined,
  privateKey: undefined,
})

const title = computed(() => props.serverKey ? 'Edit server' : 'Add new server')
const privateKeyPlaceholder = computed(() => `Private key. Default: ${ window.fsApi.homedir }/.ssh/id_rsa`)

const database = useDatabase()
const fillForm = () => {
  if (props.serverKey) {
    let server = database.data.servers[props.serverKey]
    name.value = server.name
    host.value = server.host
    port.value = server.port
    path.value = server.path
    url.value = server.url
    ssl.value = server.ssl ?? false
    username.value = server.username
    password.value = server.password
    ssh.value = server.ssh
  } else {
    name.value = serversStore.hasServers ? '' : 'Local'
    host.value = serversStore.hasServers ? '' : 'localhost'
    port.value = 6379
    path.value = undefined
    url.value = undefined
    ssl.value = false
    username.value = undefined
    password.value = undefined
    ssh.value = {
      tunnel: false,
      host: '',
      port: 22,
      user: undefined,
      password: undefined,
      privateKey: undefined,
    }
  }
}

watch(() => props.show && props.serverKey && serversStore.hasServers, fillForm)
onMounted(fillForm)

const serversStore = useServersStore()
const save = async () => {
  database.data.servers[props.serverKey || name.value] = {
    name: name.value,
    host: host.value,
    port: port.value,
    path: path.value,
    url: url.value,
    ssl: ssl.value,
    username: username.value,
    password: password.value,
    ssh: ssh.value,
  }
  database.data.history[props.serverKey || name.value] = []
  await database.write()
  serversStore.list[props.serverKey || name.value] = database.data.servers[props.serverKey || name.value]
  emit('close')
}

const redis = useRedis()
const toaster = useToaster()
const test = async () => {
  isTesting.value = true

  try {
    const redisClientConfig = redis.buildConnectionConfig({
      host: host.value,
      port: port.value,
      path: path.value,
      url: url.value,
      ssl: ssl.value,
      username: username.value,
      password: password.value,
    })
    const onSuccess = () => {
      toaster.success('Connection successful')
      isTesting.value = false
    }
    const onError = (error: string) => {
      toaster.error(error.replace(/Error: /, ''))
      isTesting.value = false
    }

    if (ssh.value.tunnel) {
      await window.redisApi.testThroughSsh({
        ...ssh.value,
        privateKey: ssh.value.privateKey || `${ window.fsApi.homedir }/.ssh/id_rsa`,
      }, redisClientConfig, onSuccess, onError)
    } else {
      await window.redisApi.test(redisClientConfig, onSuccess, onError)
    }
  } finally {
    isTesting.value = false
  }
}
</script>

<template>
  <AppModal :title="title" :show="show" @close="emit('close')">
    <input v-model="name" type="text" placeholder="Name" />
    <div class="flex space-x-4 items-center">
      <input v-model="host" type="text" placeholder="Host / IP" class="flex-1" />
      <div class="flex flex-1 items-center space-x-4">
        <input v-model="port" type="number" placeholder="Port" class="w-1/2" />
        <div class="flex items-center">
          <input id="ssl" v-model="ssl" type="checkbox" />
          <label for="ssl" class="ml-2">SSL</label>
        </div>
      </div>
    </div>
    <input v-if="!ssh.tunnel" v-model="path" type="text" placeholder="or UNIX socket path" class="flex-1" />
    <input v-if="!ssh.tunnel" v-model="url" type="text" placeholder="or URL (redis://, rediss://)" class="flex-1" />
    <div class="flex">
      <input v-model="username" placeholder="Username (optional)" class="flex-1" />
      <input v-model="password" type="password" placeholder="Password (optional)" class="flex-1 ml-4" />
    </div>
    <div class="flex space-x-4 items-baseline">
      <input id="ssh" v-model="ssh.tunnel" type="checkbox" />
      <label for="ssh">SSH tunnel</label>
    </div>
    <div v-if="ssh.tunnel" class="flex flex-col space-y-4">
      <div class="flex space-x-4">
        <input v-model="ssh.host" type="text" placeholder="SSH host / IP" class="flex-1" />
        <input v-model="ssh.port" type="number" placeholder="SSH port" />
      </div>
      <div class="flex space-x-4">
        <input v-model="ssh.user" type="text" placeholder="SSH user (optional)" class="flex-1" />
        <input v-model="ssh.password" type="password" placeholder="SSH password (optional)" class="flex-1" />
      </div>
      <div class="flex space-x-4">
        <input v-model="ssh.privateKey" type="text" :placeholder="privateKeyPlaceholder" class="flex-1" />
      </div>
    </div>
    <div class="flex justify-end space-x-4">
      <div v-if="isTesting" class="relative w-10 h-10 flex items-center justify-end">
        <Spinner />
      </div>
      <Button class="relative" :disabled="!name.length || isTesting" @click="test">
        Test
      </Button>
      <Button v-if="serversStore.hasServers" @click="emit('close')">
        Cancel
      </Button>
      <PrimaryButton :disabled="!name.length" @click="save">
        Save
      </PrimaryButton>
    </div>
  </AppModal>
</template>

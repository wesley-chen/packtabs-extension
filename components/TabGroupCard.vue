<script lang="ts" setup>
import { Card } from 'primevue';
import { ref } from 'vue';

defineProps({
  msg: String,
});

const count = ref(0);
</script>

<template>
  <h1>{{ msg }}</h1>

  <Card>
    <Button @click="count++">count is {{ count }}</Button>
  </Card>  

</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>

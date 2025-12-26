<script lang="ts" setup>
import TabGroupCard from '@/components/TabGroupCard.vue';
</script>

<template>
  <h1>Tab Group Management</h1>
  <TabGroupCard msg="WXT + Vue" />
  <Button label="Success" severity="success" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #54bc4ae0);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

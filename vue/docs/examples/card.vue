<script setup lang="ts">
import { ButtonBase, CARD_TARGET_CLASS, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Switch } from 'beui-vue'
import { ref, shallowRef, useId } from 'vue'

const id = useId()
const documents = ref([
  { title: 'Signed contract', description: 'The final PDF with every signature and the audit trail.', selected: true },
  { title: 'Invoice', description: 'Itemised billing for the period, ready for accounting.', selected: false },
])
const notifications = shallowRef(true)
const digest = shallowRef(false)
const summary = [{ label: 'Plan', value: 'Team, yearly' }, { label: 'Seats', value: '12' }]
</script>

<template>
  <div class="card-demo">
    <div class="stack">
      <Card v-for="(file, index) in documents" :key="file.title" size="compact" interactive :selected="file.selected">
        <CardHeader><CardTitle>{{ file.title }}</CardTitle><CardDescription :id="`${id}-doc-${index}`">{{ file.description }}</CardDescription>
          <CardAction><label :class="CARD_TARGET_CLASS"><input v-model="file.selected" type="checkbox" :aria-label="file.title" :aria-describedby="`${id}-doc-${index}`" /></label></CardAction>
        </CardHeader>
      </Card>
      <Card variant="muted" size="compact">
        <CardHeader><CardTitle as="h3">Notifications</CardTitle><CardDescription>Choose what reaches your inbox.</CardDescription></CardHeader>
        <CardContent class="settings">
          <div><span>Mentions and replies</span><Switch v-model:checked="notifications" aria-label="Mentions and replies" /></div>
          <div><span>Weekly digest</span><Switch v-model:checked="digest" aria-label="Weekly digest" /></div>
        </CardContent>
      </Card>
    </div>
    <div class="stack">
      <Card>
        <CardHeader><CardTitle as="h3">Review order</CardTitle><CardDescription>Check the details before you confirm.</CardDescription><CardAction><ButtonBase variant="ghost" size="sm">Edit</ButtonBase></CardAction></CardHeader>
        <CardContent><dl><div v-for="row in summary" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div></dl></CardContent>
        <CardFooter class="end"><ButtonBase variant="secondary" size="sm">Back</ButtonBase><ButtonBase size="sm">Confirm order</ButtonBase></CardFooter>
      </Card>
      <Card class="studio">
        <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&amp;fit=crop&amp;w=720&amp;q=80" width="720" height="405" loading="lazy" alt="Bright open-plan studio with long desks and plants" />
        <CardHeader><CardTitle as="h3">Studio, Lisbon</CardTitle><CardDescription>Desks for 12 people, booked for the March offsite.</CardDescription></CardHeader>
        <CardFooter><span>€1,840 · 3 days</span><ButtonBase variant="secondary" size="sm">View booking</ButtonBase></CardFooter>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.card-demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); width: 100%; max-width: 48rem; gap: 1rem; }
.stack, .settings { display: flex; flex-direction: column; gap: .75rem; }
.settings > div, dl > div { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.end { justify-content: end; }
dl { margin: 0; } dl > div { padding: .4rem 0; }
.studio { overflow: hidden; padding-top: 0; } .studio > img { width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover; }
</style>

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
const summary = [
  { label: 'Plan', value: 'Team, yearly' },
  { label: 'Seats', value: '12' },
  { label: 'Billing email', value: 'billing@acme.co' },
]
</script>

<template>
  <div class="card-demo">
    <div class="stack tight">
      <Card v-for="(file, index) in documents" :key="file.title" size="compact" interactive :selected="file.selected">
        <CardHeader>
          <CardTitle>{{ file.title }}</CardTitle>
          <CardDescription :id="`${id}-doc-${index}`">{{ file.description }}</CardDescription>
          <CardAction>
            <input v-model="file.selected" :class="[CARD_TARGET_CLASS, 'choice']" type="checkbox" :aria-label="file.title" :aria-describedby="`${id}-doc-${index}`" />
          </CardAction>
        </CardHeader>
      </Card>

      <Card variant="muted" size="compact">
        <CardHeader>
          <CardTitle as="h3">Notifications</CardTitle>
          <CardDescription>Choose what reaches your inbox.</CardDescription>
        </CardHeader>
        <CardContent class="settings">
          <div class="line"><span>Mentions and replies</span><Switch v-model:checked="notifications" aria-label="Mentions and replies" /></div>
          <div class="line"><span>Weekly digest</span><Switch v-model:checked="digest" aria-label="Weekly digest" /></div>
        </CardContent>
      </Card>
    </div>

    <div class="stack">
      <Card>
        <CardHeader>
          <CardTitle as="h3">Review order</CardTitle>
          <CardDescription>Check the details before you confirm.</CardDescription>
          <CardAction><ButtonBase variant="ghost" size="sm">Edit</ButtonBase></CardAction>
        </CardHeader>
        <CardContent>
          <dl>
            <div v-for="row in summary" :key="row.label" class="line row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter class="end">
          <ButtonBase variant="secondary" size="sm">Back</ButtonBase>
          <ButtonBase size="sm">Confirm order</ButtonBase>
        </CardFooter>
      </Card>

      <Card class="studio">
        <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&amp;fit=crop&amp;w=720&amp;q=80" width="720" height="405" loading="lazy" alt="Bright open-plan studio with long desks and plants" />
        <CardHeader>
          <CardTitle as="h3">Studio, Lisbon</CardTitle>
          <CardDescription>Desks for 12 people, booked for the March offsite.</CardDescription>
        </CardHeader>
        <CardFooter class="between">
          <span class="price"><span>€1,840</span> · 3 days</span>
          <ButtonBase variant="secondary" size="sm">View booking</ButtonBase>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Mirrors the upstream preview: one column below the md breakpoint, two from 768px. */
.card-demo { display: grid; width: 100%; max-width: 48rem; align-items: start; gap: 1rem; }
@media (min-width: 768px) { .card-demo { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.stack { display: flex; flex-direction: column; gap: 1rem; }
.stack.tight { gap: .75rem; }
.settings { display: flex; flex-direction: column; gap: .75rem; }
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
dl { margin: 0; }
.row { padding-block: .625rem; }
.row:first-child { padding-top: 0; }
.row:last-child { padding-bottom: 0; }
.row + .row { border-top: 1px solid var(--beui-border); }
dt { color: var(--beui-muted-foreground); }
dd { margin: 0; color: var(--beui-foreground); font-weight: 500; }
.end { justify-content: flex-end; }
.between { justify-content: space-between; }
.studio { overflow: hidden; padding-top: 0; }
.studio > img { display: block; width: 100%; aspect-ratio: 16 / 9; height: auto; object-fit: cover; }
.price { color: var(--beui-muted-foreground); font-size: .875rem; }
.price > span { color: var(--beui-foreground); font-weight: 500; }

/* Native checkbox drawn like the library Checkbox: 20px, 2px border, primary fill and check when on. */
.choice { appearance: none; display: inline-grid; place-content: center; width: 1.25rem; height: 1.25rem; margin: 0; border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); border-radius: .375rem; background: var(--beui-background); cursor: pointer; transition: background-color .2s, border-color .2s; }
.choice:hover { border-color: var(--beui-muted-foreground); }
.choice:checked { border-color: var(--beui-primary); background: var(--beui-primary) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12.5 4.5 4.5L19 7.5'/%3E%3C/svg%3E") center / 80% no-repeat; }
</style>

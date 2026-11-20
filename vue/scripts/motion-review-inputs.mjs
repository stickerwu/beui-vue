const sliders = new Set(['arc-picker','before-after-slider','color-picker','range-slider-inline','range-slider','range-slider-fluid','range-slider-wave','range-slider-bubble','range-slider-ruler'])
const scrolling = new Set(['scroll-progress','scroll-reveal','smooth-scroll','parallax','infinite-masonry','wheel-picker','message-scroller'])
const textInputs = new Set(['input','otp-input','prompt-input','signup-form'])
const hover = new Set(['button-magnetic','button-metallic','expanding-arrow-button','tooltip','tilt-card','dock','not-found-magnetic','not-found-spotlight','not-found-stacked','knockout-wheel','avatar-group','project-folder'])
const idle = new Set(['timeline','alert','aspect-ratio','card','breadcrumb','marquee','loader','reasoning-text','thinking-shimmer','text-shimmer','shader-background','animated-number','chromatic-text-reveal','text-reveal','text-cascade','status-bar','image-generation','agent-activity','agent-progress','tool-result','streaming-response','voice-orb','message','not-found-terminal','not-found-glitch'])

export function scenarioFor(entry) {
  const {slug,category} = entry
  if (idle.has(slug)) return {kind:'observe', reason:'Observe the mounted preview and its authored animation.'}
  if (sliders.has(slug)) return {kind:'key', selector:'[role=slider], input[type=range]',key:'ArrowRight'}
  if (textInputs.has(slug)) return {kind:'text',selector:'textarea, input:not([type]), input[type=text], input[type=email]',text:slug==='otp-input'?'123456':'Motion review'}
  if (['tabs','expandable-tabs','morphing-tabs'].includes(slug)) return {kind:'activate', selector:'[role=tab]', preferNext:true}
  if (slug==='checkbox' || slug==='switch') return {kind:'activate',selector:`[role=${slug}], input[type=checkbox]`}
  if (slug==='radio') return {kind:'activate',selector:'[role=radio], input[type=radio]',preferNext:true}
  if (slug==='hold-action-button') return {kind:'hold',selector:'button'}
  if (slug==='context-menu') return {kind:'context',selector:'[aria-haspopup=menu], [data-context-menu-trigger], [tabindex="0"]'}
  if (slug==='pull-to-refresh' || slug==='swipeable-list' || slug==='slide-action-button' || slug==='sortable-stack') return {kind:'drag',axis:slug==='pull-to-refresh'||slug==='sortable-stack'?'y':'x'}
  if (scrolling.has(slug)) return {kind:'wheel',deltaY:180}
  if (category==='charts' || hover.has(slug)) return {kind:'pointer',fractions:[[.32,.45],[.68,.54]]}
  return {kind:'activate', selector:'button, [role=button], summary, [role=combobox], select'}
}

function normalize(name) {
  return name.toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim()
}

async function candidates(stage, selector) {
  return stage.locator(selector).evaluateAll(elements => elements.flatMap((element,index) => {
    const rect = element.getBoundingClientRect()
    if (rect.width<2||rect.height<2||element.matches(':disabled,[aria-disabled=true]')) return []
    if (element.closest('label')?.textContent.trim().startsWith('Example')) return []
    if (element.closest('[data-motion-review-ignore]')) return []
    const style=getComputedStyle(element)
    if (style.display==='none'||style.visibility==='hidden') return []
    const labelled=element.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent).join(' ')
    const name=element.getAttribute('aria-label')||labelled||element.labels?.[0]?.textContent||element.textContent||element.getAttribute('placeholder')||''
    return [{index, name:name.replace(/\s+/g,' ').trim().slice(0,90),tag:element.localName,role:element.getAttribute('role')||element.type||element.localName}]
  }))
}

export async function planInput(scenario, views) {
  if (!scenario.selector) return {scenario, targets:{}, inputEquivalence:'identical-sequence', semanticMatch:'unverified-fixtures'}
  const [react,vue] = await Promise.all(views.map(view=>candidates(view.stage,scenario.selector)))
  const order = scenario.preferNext && react.length>1 ? [...react.slice(1),react[0]] : react
  for (const target of order) {
    const name=normalize(target.name)
    const other = name && vue.find(item=>normalize(item.name)===name)
    if (other) return {scenario,targets:{react:target,vue:other},inputEquivalence:'same-action-and-name',semanticMatch:name}
  }
  const index = scenario.preferNext && react.length>1 && vue.length>1 ? 1 : 0
  const targets={react:react[index]??null,vue:vue[index]??null}
  return {scenario,targets,inputEquivalence:targets.react&&targets.vue?'same-action-by-position':'no-common-control',semanticMatch:'unverified-fixtures'}
}

export async function performInput(view,plan) {
  const {page,stage,side}=view
  const {scenario}=plan
  if (scenario.kind==='observe' || plan.inputEquivalence==='no-common-control') return
  const target = plan.targets[side]
  if (target) {
    const locator=stage.locator(scenario.selector).nth(target.index)
    if (scenario.kind==='text' || scenario.kind==='key') {
      await locator.focus()
      if (scenario.kind==='text') await page.keyboard.insertText(scenario.text)
      else await page.keyboard.press(scenario.key)
      return
    }
    const rect=await locator.boundingBox()
    if (!rect) throw Error(`Control disappeared before ${scenario.kind}`)
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2)
    if (scenario.kind==='hold') await page.mouse.down()
    else await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2,{button:scenario.kind==='context'?'right':'left'})
    return
  }
  const rect=await stage.boundingBox()
  const position=(x,y)=>[rect.x+rect.width*x,rect.y+rect.height*y]
  if (scenario.kind==='wheel') {
    await page.mouse.move(...position(.5,.5))
    await page.mouse.wheel(0,scenario.deltaY)
  } else if (scenario.kind==='drag') {
    await page.mouse.move(...position(.4,.4))
    await page.mouse.down()
    await page.mouse.move(...position(scenario.axis==='x'?.7:.4,scenario.axis==='y'?.7:.4),{steps:5})
    await page.mouse.up()
  } else {
    for (const [x,y] of scenario.fractions) await page.mouse.move(...position(x,y))
  }
}

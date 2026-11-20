import './stage.css'

const query = new URLSearchParams(location.search)
document.documentElement.classList.toggle('dark', query.get('theme') === 'dark')
const {mount} = query.has('original') ? await import('./gallery') : query.get('side') === 'react' ? await import('./upstream') : await import('./vue-side')
mount(query.get('slug') || 'button-base')

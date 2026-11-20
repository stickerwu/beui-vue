export function expectedExamples(entry) {
  return entry.examples.length ? entry.examples : [{slug:entry.slug, title:entry.title, previewKey:`${entry.category}/${entry.slug}`}]
}

export function approvedExamples(entry, port) {
  return expectedExamples(entry).filter(example => (port?.acceptance ?? []).some(review =>
    review.variant === example.slug && review.status === 'approved' &&
    ['frames', 'keyboard', 'touch', 'reducedMotion'].every(key => typeof review[key] === 'string' && review[key].trim().length > 0)
  ))
}

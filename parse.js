function parse (link) {
  const items = link.split(',')

  let next
  for (const item of items) {
    const parsed = item.split(';')

    if (parsed[1].includes('next')) {
      next = parsed[0].trimStart().trim()
      next = next.slice(1, -1)
      break
    }
  }

  if (next) {
    const options = {
      url: new URL(next)
    }

    return options
  }

  return false
}

console.log(
  parse('<https://api.github.com/search/code?q=filename%3Apackage.json+filename%3AGemfile+repo%3Afacebook%2Freact&page=2>; rel="next", <https://api.github.com/search/code?q=filename%3Apackage.json+filename%3AGemfile+repo%3Afacebook%2Freact&page=3>; rel="last"')
)

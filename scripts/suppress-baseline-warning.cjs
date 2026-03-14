const originalWarn = console.warn

console.warn = (...args) => {
  const firstArg = args[0]

  if (typeof firstArg === 'string' && firstArg.includes('[baseline-browser-mapping] The data in this module is over two months old.')) {
    return
  }

  originalWarn(...args)
}

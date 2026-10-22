export function debounce(fn, delay = 300) {
  let timerId;

  function debounced(...args) {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  }

  debounced.cancel = () => {
    clearTimeout(timerId);
    timerId = undefined;
  };

  debounced.flush = (...args) => {
    clearTimeout(timerId);
    timerId = undefined;
    return fn.apply(this, args);
  };

  return debounced;
}

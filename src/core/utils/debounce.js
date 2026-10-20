export default function debounce(callback, delay = 400) {
  let timerId;
  function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      callback(...args);
    }, delay);
  }

  debounced.cancel = () => {
    clearTimeout(timerId);
  };

  return debounced;
}

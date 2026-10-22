export function createAbortController() {
  let controller = null;

  return {
    create() {
      this.abort();
      controller = new AbortController();
      return controller;
    },

    abort(reason) {
      if (controller && !controller.signal.aborted) {
        controller.abort(reason);
      }

      controller = null;
    },

    get signal() {
      return controller?.signal ?? null;
    },

    get current() {
      return controller;
    },
  };
}
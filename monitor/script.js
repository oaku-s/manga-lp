(() => {
  const resetFrameScroll = (frame) => {
    if (frame.dataset.initialScrollReset === "done") {
      return;
    }
    try {
      frame.contentWindow?.scrollTo(0, 0);
      frame.dataset.initialScrollReset = "done";
    } catch (error) {
      // Cross-origin or unavailable frames are ignored.
    }
  };

  const init = () => {
    document.querySelectorAll(".phone-frame iframe").forEach((frame) => {
      frame.addEventListener("load", () => resetFrameScroll(frame), { once: true });
      try {
        if (frame.contentDocument?.readyState === "complete") {
          resetFrameScroll(frame);
        }
      } catch (error) {
        // Cross-origin or unavailable frames are ignored.
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

import { nextTick } from 'vue'

/**
 * Masonry layout for the cards grids: sizes each card's grid-row span to its
 * rendered height and re-applies the layout when card sizes change.
 *
 * @returns {Object} Layout and resize-observation functions.
 */
export function useMasonry() {
  let cardResizeObserver = null
  let resizeObserverTimeout = null

  function setCardRowSpans() {
    const grids = document.querySelectorAll('.cards-grid')
    grids.forEach((grid) => {
      const cards = grid.querySelectorAll('.todo-card')

      cards.forEach((card) => {
        const height = card.getBoundingClientRect().height
        const rowSpan = Math.ceil(height / 17) + 1
        card.style.gridRowEnd = `span ${rowSpan}`
      })
    })
  }

  function observeCards() {
    if (!cardResizeObserver) return
    // Disconnect existing observations
    cardResizeObserver.disconnect()
    // Observe all cards
    const cards = document.querySelectorAll('.todo-card')
    cards.forEach((card) => {
      cardResizeObserver.observe(card)
    })
  }

  function applyMasonryLayout() {
    // Apply masonry layout to all card grids
    nextTick(() => {
      setTimeout(() => {
        setCardRowSpans()

        // Apply again after a short delay to catch any late-rendering content
        setTimeout(() => {
          setCardRowSpans()
          // Re-observe cards in case new ones were added
          observeCards()
        }, 200)
      }, 150)
    })
  }

  function startCardResizeObserver(onResize) {
    // Watch for card size changes, debouncing the layout update
    cardResizeObserver = new ResizeObserver((_entries) => {
      if (resizeObserverTimeout) {
        clearTimeout(resizeObserverTimeout)
      }
      resizeObserverTimeout = setTimeout(onResize, 100)
    })

    // Start observing cards after initial render
    nextTick(() => {
      observeCards()
    })
  }

  function stopCardResizeObserver() {
    if (cardResizeObserver) {
      cardResizeObserver.disconnect()
    }
  }

  return {
    applyMasonryLayout,
    observeCards,
    startCardResizeObserver,
    stopCardResizeObserver
  }
}

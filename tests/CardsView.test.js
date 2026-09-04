// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardsView from '../src/renderer/components/CardsView.vue'
import { CARD_MIN_WIDTHS } from '../src/renderer/utils/cardWidth.js'

// The card grid is an auto-fill grid: the chosen minimum width reaches the CSS
// as --card-min-width and decides how many columns fit.
describe('CardsView card width', () => {
  it('publishes the chosen minimum card width on the grid', () => {
    const wrapper = mount(CardsView, {
      props: { sortedTodos: [], cardColumns: 3, cardMinWidth: CARD_MIN_WIDTHS.l }
    })
    expect(wrapper.get('.cards-grid').attributes('style')).toContain(
      `--card-min-width: ${CARD_MIN_WIDTHS.l}`
    )
  })
})

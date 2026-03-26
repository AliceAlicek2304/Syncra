import type { RepurposeAtom, RepurposePlatform } from '../../types/ai'

export function buildRepurposeCardItems(
  atoms: RepurposeAtom[],
  activeFilter: RepurposePlatform | 'All',
): RepurposeAtom[] {
  return activeFilter === 'All' ? atoms : atoms.filter(atom => atom.platform === activeFilter)
}

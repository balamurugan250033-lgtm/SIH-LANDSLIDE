export const NER_STATES = [
  'Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Sikkim', 'Tripura',
];

export function regionBelongsToState(region, state) {
  return Boolean(region?.name && state && region.name.toLowerCase().includes(state.toLowerCase()));
}

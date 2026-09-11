export const NER_STATES = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
];

export function getStateForRegion(name = '') {
  const value = name.toLowerCase();
  return NER_STATES.find((state) => value.includes(state.toLowerCase())) || null;
}

export function groupRegionsByState(regions = []) {
  return NER_STATES.map((state) => ({
    state,
    regions: regions.filter((region) => getStateForRegion(region.name) === state),
  }));
}

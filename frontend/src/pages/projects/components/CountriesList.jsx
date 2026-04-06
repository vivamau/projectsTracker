const CountriesList = (props) => {
  function compare(a, b) {
    if (a.short_name < b.short_name) {
      return -1;
    }
    if (a.short_name > b.short_name) {
      return 1;
    }
    return 0;
  }

  return props.countries.sort(compare).map((country, i) => (
    <span key={i}>
      <a>{country.short_name}</a> |{' '}
    </span>
  ));
};
export default CountriesList;

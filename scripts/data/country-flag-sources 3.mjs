/**
 * Wikimedia Commons flag file names for national-team countries in FootyCompass.
 * Public-domain / free-use national flags only.
 */
export const COUNTRY_FLAG_SOURCES = {
  England: 'Flag_of_England.svg',
  France: 'Flag_of_France.svg',
  Spain: 'Flag_of_Spain.svg',
  Brazil: 'Flag_of_Brazil.svg',
  Argentina: 'Flag_of_Argentina.svg',
  Germany: 'Flag_of_Germany.svg',
  Portugal: 'Flag_of_Portugal.svg',
  Italy: 'Flag_of_Italy.svg',
  Netherlands: 'Flag_of_the_Netherlands.svg',
  Belgium: 'Flag_of_Belgium.svg',
  Croatia: 'Flag_of_Croatia.svg',
  Switzerland: 'Flag_of_Switzerland.svg',
  Denmark: 'Flag_of_Denmark.svg',
  Serbia: 'Flag_of_Serbia.svg',
  Turkey: 'Flag_of_Turkey.svg',
  'United States': 'Flag_of_the_United_States.svg',
  Mexico: 'Flag_of_Mexico.svg',
  Uruguay: 'Flag_of_Uruguay.svg',
  Colombia: 'Flag_of_Colombia.svg',
  Chile: 'Flag_of_Chile.svg',
  Morocco: 'Flag_of_Morocco.svg',
  Senegal: 'Flag_of_Senegal.svg',
  Nigeria: 'Flag_of_Nigeria.svg',
  Japan: 'Flag_of_Japan.svg',
  'South Korea': 'Flag_of_South_Korea.svg',
  Norway: 'Flag_of_Norway.svg',
  Ghana: 'Flag_of_Ghana.svg',
  Algeria: 'Flag_of_Algeria.svg',
  Poland: 'Flag_of_Poland.svg',
  Austria: 'Flag_of_Austria.svg',
  Ukraine: 'Flag_of_Ukraine.svg',
  Scotland: 'Flag_of_Scotland.svg',
  Paraguay: 'Flag_of_Paraguay.svg',
  Czechia: 'Flag_of_the_Czech_Republic.svg',
  Sweden: 'Flag_of_Sweden.svg',
  "Côte d'Ivoire": 'Flag_of_Côte_d\'Ivoire.svg',
  Canada: 'Flag_of_Canada.svg',
  Australia: 'Flag_of_Australia.svg',
  Ecuador: 'Flag_of_Ecuador.svg',
  'Bosnia and Herzegovina': 'Flag_of_Bosnia_and_Herzegovina.svg',
  'DR Congo': 'Flag_of_the_Democratic_Republic_of_the_Congo.svg',
  Haiti: 'Flag_of_Haiti.svg',
  Tunisia: 'Flag_of_Tunisia.svg',
  Egypt: 'Flag_of_Egypt.svg',
  Qatar: 'Flag_of_Qatar.svg',
  'Saudi Arabia': 'Flag_of_Saudi_Arabia.svg',
  Iran: 'Flag_of_Iran.svg',
  'South Africa': 'Flag_of_South_Africa.svg',
  Panama: 'Flag_of_Panama.svg',
  Iraq: 'Flag_of_Iraq.svg',
  Jordan: 'Flag_of_Jordan.svg',
  Uzbekistan: 'Flag_of_Uzbekistan.svg',
  'New Zealand': 'Flag_of_New_Zealand.svg',
  'Cape Verde': 'Flag_of_Cape_Verde.svg',
  Curaçao: 'Flag_of_Curaçao.svg',
};

export function slugifyCountry(country) {
  return String(country ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

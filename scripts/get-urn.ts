const token = "AQWrPQsL-WXkPl7yhgvxAAkGpbBz_ntpx36zDF9_-sSL8geBR42AU_hqidGJepMUBS3jbWrJFFa44B33xIXoqgB1QfcLPIaTAMCvitSiKSOeYEuOl7-OZw39HR7LQ2kJ5RG2zQ0lkFIka0Ky5SH1Qd6mNc6-LZQWH3tYAhqlym_P0bq93uAcKEMd7IhalyuKjqfHcNm0RvomnvHdacrR_3PqzsiQFqf4gZ1gZRZGyFlY5fM1swTegdH5ae2EN059ss17Tgj_Dm58sUcs40tuW9xkmKTEJMZBd9MWB1KRcUGyfv-GHfdGcVv-TF0DZNv8-WHYWIU5S8sj87rEN_ZX-FzF5qtoNw";

async function getUrn() {
    try {
        const response = await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error("Failed:", await response.text());
            return;
        }

        const data = await response.json();
        console.log(`URN: urn:li:person:${data.id}`);
    } catch (e) {
        console.error(e);
    }
}

getUrn();

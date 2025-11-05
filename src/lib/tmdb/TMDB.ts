import { TMDB_READ_ACCESS_TOKEN } from "$env/static/private";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import type { SearchResult } from "$lib/types/SearchResult";
import { ErrorUtil } from "$lib/util/ErrorUtil";
import { TextUtil } from "$lib/util/TextUtil";

type TMBDMovie = {
    id: number,
    title: string,
    release_date: string,
    poster_path: string,
    origin_country?: string[],
    original_title?: string,
    runtime: number,
    genres: {
        id: number
    }[]
}

type TMBDShow = {
    id: number,
    name: string,
    first_air_date: string,
    poster_path: string,
    origin_country?: string[],
    original_name?: string,
    seasons: {
        season_number: number,
        name: string,
        air_date: string
    }[],
    genres: {
        id: number
    }[]
}

type TMDBSeason = {
    season_number: number,
    name: string,
    air_date: string,
    episodes: {
        episode_number: number,
        name: string,
        air_date: string,
        runtime: number
    }[]
}

const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000;

class ReleaseDates {
    theatricalNoNote?: string
    theatricalWithNote?: string
    digital?: string
    fallbackDate?: string

    getMostRelevant() {
        return this.theatricalNoNote || this.digital || this.fallbackDate || this.theatricalWithNote;
    }
}

export class TMDB {

    static getHeaders(): {
        'Accept': string;
        'Authorization': string;
    } {
        return {
            'Accept': 'application/json',
            'Authorization': `Bearer ${TMDB_READ_ACCESS_TOKEN}`
        };
    }

    static async getMovie(movieId: string, locale:string = 'en-US'): Promise<TMBDMovie> {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=${locale}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const movie = await response.json();
        if (movie?.poster_path) {
            movie.poster_path = `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${movie?.poster_path}`;
        }
        return movie
    }

    static async searchMovie(query: string): Promise<SearchResult[]> {
        const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const responses = await response.json();
        const results = [];
        for (const resp of responses.results) {
            results.push({
                id: resp.id,
                name: resp.title,
                link: `https://www.themoviedb.org/movie/${resp.id}`,
                date: resp.release_date
            });
        }
        return results;
    }

    static async getMovieReleaseDate(movieId: string, originCountry?: string): Promise<Date | undefined> {
        if (!originCountry) {
            return undefined;
        }
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const releaseDatesByCountries = (await response.json()).results;

        let frDates: ReleaseDates = new ReleaseDates();
        let usDates: ReleaseDates = new ReleaseDates();
        let originCountryDates: ReleaseDates = new ReleaseDates();
        let defaultDates: ReleaseDates = new ReleaseDates();
    
        for (const releaseDatesForCountry of releaseDatesByCountries) {
            const countryDates: ReleaseDates = new ReleaseDates();
            for (const releaseDate of releaseDatesForCountry.release_dates) {
                if (!countryDates.theatricalNoNote && releaseDate.type === 3 && (!releaseDate.note || releaseDate.note === '')) {
                    countryDates.theatricalNoNote = releaseDate.release_date;
                } else if (releaseDate.type === 3 || releaseDate.type === 1) {
                    countryDates.theatricalWithNote = releaseDate.release_date;
                } else if (releaseDate.type === 4) {
                    countryDates.digital = releaseDate.release_date;
                } else {
                    countryDates.fallbackDate = releaseDate.release_date;
                }
            }
            if (releaseDatesForCountry.iso_3166_1 === 'FR') {
                frDates = countryDates;
            } else if (releaseDatesForCountry.iso_3166_1 === 'US') {
                usDates = countryDates;
            } else if (releaseDatesForCountry.iso_3166_1.toLowerCase() === originCountry?.toLowerCase()) {
                originCountryDates = countryDates;
            } else {
                defaultDates = countryDates;
            }
        }
        let releaseDate = originCountryDates.theatricalNoNote || originCountryDates.fallbackDate;
        if (!releaseDate) {
            const frDate = frDates.getMostRelevant();
            const usDate = usDates.getMostRelevant();
            if (frDate && usDate) {
                if (new Date(frDate).getTime() > new Date(usDate).getTime() + threeMonthsInMs) {
                    releaseDate = usDate;
                } else {
                    releaseDate = frDate;
                }
            } else {
                releaseDate = frDate || usDate;
            }
        }
        if (!releaseDate) {
            releaseDate = defaultDates.getMostRelevant();
        }
        return releaseDate ? new Date(releaseDate) : undefined;
    }

    static async getMovieTitle(movieId: string, tmdbMovie: TMBDMovie): Promise<string> {
        if (tmdbMovie.origin_country?.[0] === 'FR' && tmdbMovie.original_title) {
            return tmdbMovie.original_title;
        }
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/translations`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const translations = (await response.json()).translations;

        let frName = null;
        let usName = null;
        let originCountryName = null;

        for (const translation of translations) {
            if (translation.iso_3166_1 === 'FR') {
                frName = translation.data.title;
                if (!frName && tmdbMovie.origin_country?.includes('FR') && tmdbMovie.original_title) {
                    return tmdbMovie.original_title;
                }
            } else if (translation.iso_3166_1 === 'US') {
                usName = translation.data.title;
                if (!usName && tmdbMovie.origin_country?.includes('US') && tmdbMovie.original_title) {
                    usName = tmdbMovie.original_title;
                }
            } else if (translation.iso_3166_1.toLowerCase() === tmdbMovie.origin_country?.[0].toLowerCase()) {
                originCountryName = translation.data.title;
                if (!originCountryName && tmdbMovie.original_title) {
                    originCountryName = tmdbMovie.original_title;
                }
            }
        }
        return frName || usName || originCountryName;
    }

    static async initMovieGenres(): Promise<void> {
        const response = await fetch("https://api.themoviedb.org/3/genre/movie/list?language=en", {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const jsonResponse = await response.json();
        for (const genre of jsonResponse.genres) {
            try {
                await MovieDB.addGenreDefinition(genre.id, genre.name);
            } catch (e) {
                console.error(ErrorUtil.getErrorMessage(e));
            }
        }
    }

    static async getTvshow(tvshowId: string, locale:string = 'en-US'): Promise<TMBDShow> {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}?language=${locale}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const tvshow = await response.json();
        if (tvshow?.poster_path) {
            tvshow.poster_path = `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${tvshow?.poster_path}`;
        }
        return tvshow;
    }

    static async getTvshowSeasons(tvshowId: string, seasonIndex: number): Promise<TMDBSeason> {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}/season/${seasonIndex}?language=en-US`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        return await response.json();
    }

    static async searchTvshow(query: string): Promise<SearchResult[]> {
        const response = await fetch(`https://api.themoviedb.org/3/search/tv?query=${query}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const responses = await response.json();
        const results = [];
        for (const resp of responses.results) {
            results.push({
                id: resp.id,
                name: resp.name,
                link: `https://www.themoviedb.org/tv/${resp.id}`,
                date: resp.first_air_date
            });
        }
        return results;
    }

    static async getTvshowTitle(tvshowId: string, tmdbShow: TMBDShow): Promise<string> {
        if (tmdbShow.origin_country?.[0] === 'FR' && tmdbShow.original_name) {
            return tmdbShow.original_name;
        }
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}/translations`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const translations = (await response.json()).translations;

        let frName = null;
        let usName = null;
        let originCountryName = null;

        for (const translation of translations) {
            if (translation.iso_3166_1 === 'FR') {
                frName = translation.data.name;
            } else if (translation.iso_3166_1 === 'US') {
                usName = translation.data.name;
            } else if (translation.iso_3166_1.toLowerCase() === tmdbShow.origin_country?.[0].toLowerCase()) {
                if (TextUtil.areEastAsianCharactersOverThreashold(translation.data.name)) {
                    originCountryName = translation.data.name;
                }
            }
        }
        return frName || usName || originCountryName || tmdbShow.name;
    }

    static async initTvshowGenres(): Promise<void> {
        const response = await fetch("https://api.themoviedb.org/3/genre/tv/list?language=en", {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const jsonResponse = await response.json();
        for (const genre of jsonResponse.genres) {
            try {
                await TvshowDB.addGenreDefinition(genre.id, genre.name);
            } catch (e) {
                console.error(ErrorUtil.getErrorMessage(e));
            }   
        }
    }
}

# Semantic Cities Analytics
Web-app that offers an interface to analyze the results of a "Semantic Cities Framework" survey
--------------

This app is part of the "Semantic Cities Framework", which intends to offer a efficient and effective way to gather a population's mental map towards any given area.

To achieve this, based on a given survey, this tool allows the exploration of data from participations. It offers a complete interface to see how participants drew on the map, placed markers, or answered questions.

To analyze the participations from a Semantic Cities survey one needs:

- a published ["Semantic Cities Survey"](https://github.com/fplgusmao/semanticCitiesSurvey)
- a database with the participations on the survey
- [recommended] a host server with this repository's files

Note that the host server is just that: a host. Thus, there is no need to deploy a dedicated server, there is only need to deploy the due app files into a host.

There is a possibility for this project to work by just running it locally, but it wasn't made with that in mind, so proceed carefully.

The whole process of deploying this web-app consists of:

1. Specifying a "Semantic Cities Survey" JSON;
	- The same specification that was used for the published survey
    - That specification should be put into `src/client/app/data`
2. [if needed] Editing, on `src/client/app/core/constants.js`, the `hostPath` constant, to match the directory structure where the app will be deployed;
3. [if needed] Editing, on `src/client/index.html`, the different `build:*` comments, with the same path prefix used on the previous step;
4. Editing the `src/client/app/db/db-config.php` file, giving the information needed to access the database;
5. Opening a terminal and making `gulp build` on the project's root directory;
6. Uploading the necessary files to the host, in the same directory as specified in steps 2 and 3. Given that you are uploading the files to a `analytics/` directory on the host:
    - Upload the `build/index.html` into `analytics/`; in the host the path should be, for our example, `analytics/index.html`
    - Upload both `build/analytics/js` and `build/analytics/styles` to the host, but only those directories, not their parent; in the host their path should be, for our example, `analytics/js` and `analytics/styles`
    - Upload the whole `src/client/app/db` directory; in the host the path should be, for our example, `analytics/db`
    - Upload the whole `src/client/app/data` directory; in the host the path should be, for our example, `analytics/data`

This project's code structure follows the [Hottowel SPA Template](https://github.com/johnpapa/generator-hottowel) for Angular.JS. The most relevant technologies are [Leaflet.JS](http://leafletjs.com/), for map manipulation, and [Turf.JS](http://turfjs.org/), for most of the spatial analysis needed.

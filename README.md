# Semantic Cities Analytics
Web-app that offers an interface to analyze the results of a "Semantic Cities Framework" survey
--------------

This app is part of the "Semantic Cities Framework", which intends to offer a efficient and effective way to gather a population's mental map towards any given area.

To achieve this, based on a given survey, this tool allows the exploration of data from participations. It offers a complete interface to see how participants drew on the map, placed markers, or answered questions.

To analyze the participations from a Semantic Cities survey one needs:

- a published ["Semantic Cities Survey"](https://github.com/fplgusmao/semanticCitiesSurvey)
- a database with the participations on the survey
- [recommended] a host server with this repository's files

Note that the host server is just that: a host. Thus, there is no need to deploy a dedicated server, there is only need to deploy the due app files into a host. This particular decision also influenced some of the project's implementation; [details can be seen bellow](#implementation-notes).

There's a [simple example online](web.ist.utl.pt/ist169808/analytics), based on a dummy survey to illustrate the possibilities of this tool, the respective [survey is also online](web.ist.utl.pt/ist169808/survey).

## Deploying the Semantic Cities Analytics app

There is a possibility for this app to work by just running it locally, but it wasn't made with that in mind, so proceed carefully.

The whole process of deploying this web-app consists of:

1. Specifying a "Semantic Cities Survey" JSON;
	- The same specification that was used for the published survey (see [Semantic Cities Survey](https://github.com/fplgusmao/semanticCitiesSurvey))
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

## Implementation notes
This project's code structure follows the [Hottowel SPA Template](https://github.com/johnpapa/generator-hottowel) for Angular.JS. The most relevant technologies are [Leaflet.JS](http://leafletjs.com/), for map manipulation, and [Turf.JS](http://turfjs.org/), for most of the spatial analysis needed.

### The `server/` folder
In the project files there is a `server/` folder. It contains a simple Node.js app to deploy into a compatible server. However, as previously mentioned, this app runs on the client side only, and thus there is no need to deploy such a server. The folder is there only temporarily, to allow the correct building process, that in turn was imported from the [Hottowel SPA Template](https://github.com/johnpapa/generator-hottowel). In time, it is something to remove, but since it doesn't interfere with the final result, it's a low-priority task.

### Mobile version?
This web-app is meant for **desktop only**, since it is a too complex interface and interaction for mobile devices. There is no intention in developing such a version, since this app is targeted to serious and long analysis session, and not to spontaneous or "mobile" interactions.
 Why you should do it regularly: https://github.com/browserslist/update-db#readme
12:40:51 AM [express] GET /api/glossary 304 in 59ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:40:53 AM [express] GET /api/glossary 304 in 47ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:40:54 AM [express] GET /api/glossary 304 in 50ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:41:49 AM [express] GET /api/participants/79d051f8-ec7b-4e1e-8ca0-949d2613c113 304 in 97ms :: {"id"…
12:41:49 AM [express] GET /api/glossary 304 in 421ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e"…
12:41:49 AM [express] GET /api/sessions/C98MVE 304 in 448ms :: {"id":"2f3cc308-33d5-42bd-a058-9a08aaf…
12:41:49 AM [express] GET /api/participants/79d051f8-ec7b-4e1e-8ca0-949d2613c113/responses 304 in 459…
12:41:50 AM [express] GET /api/packages/WINE01/slides 304 in 729ms :: {"slides":[{"id":"113947af-7b29…
12:42:48 AM [express] GET /api/glossary 304 in 48ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:42:48 AM [express] GET /api/packages 200 in 144ms :: [{"id":"ad972839-0d4b-4ae0-8371-164303a91517"…
12:43:07 AM [express] GET /api/packages/WINE01/editor 200 in 308ms :: {"id":"ad972839-0d4b-4ae0-8371-…
12:43:14 AM [express] GET /api/glossary 304 in 47ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:43:17 AM [express] GET /api/glossary 304 in 46ms :: [{"id":"143f4eaf-5772-4eef-ad3b-e45d9aabd48e",…
12:43:17 AM [express] GET /api/packages 304 in 142ms :: [{"id":"ad972839-0d4b-4ae0-8371-164303a91517"…
12:43:18 AM [express] GET /api/sessions 200 in 48ms :: [{"id":"0efc1331-7405-424f-84b1-8d37ef69912f",…
Error creating package: TypeError: Cannot read properties of undefined (reading 'toUpperCase')
    at <anonymous> (/home/runner/workspace/server/routes.ts:427:60)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at next (/home/runner/workspace/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/home/runner/workspace/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:284:15
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at <anonymous> (/home/runner/workspace/server/index.ts:36:3)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at trim_prefix (/home/runner/workspace/node_modules/express/lib/router/index.js:328:13)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:286:9
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at urlencodedParser (/home/runner/workspace/node_modules/body-parser/lib/types/urlencoded.js:85:7)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at trim_prefix (/home/runner/workspace/node_modules/express/lib/router/index.js:328:13)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:286:9
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at /home/runner/workspace/node_modules/body-parser/lib/read.js:137:5
    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)
    at invokeCallback (/home/runner/workspace/node_modules/raw-body/index.js:238:16)
    at done (/home/runner/workspace/node_modules/raw-body/index.js:227:7)
    at IncomingMessage.onEnd (/home/runner/workspace/node_modules/raw-body/index.js:287:7)
    at IncomingMessage.emit (node:events:518:28)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)
12:43:27 AM [express] POST /api/packages 500 in 9ms :: {"message":"Internal server error"}
Error creating package: TypeError: Cannot read properties of undefined (reading 'toUpperCase')
    at <anonymous> (/home/runner/workspace/server/routes.ts:427:60)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at next (/home/runner/workspace/node_modules/express/lib/router/route.js:149:13)
    at Route.dispatch (/home/runner/workspace/node_modules/express/lib/router/route.js:119:3)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:284:15
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at <anonymous> (/home/runner/workspace/server/index.ts:36:3)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at trim_prefix (/home/runner/workspace/node_modules/express/lib/router/index.js:328:13)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:286:9
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at urlencodedParser (/home/runner/workspace/node_modules/body-parser/lib/types/urlencoded.js:85:7)
    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)
    at trim_prefix (/home/runner/workspace/node_modules/express/lib/router/index.js:328:13)
    at /home/runner/workspace/node_modules/express/lib/router/index.js:286:9
    at Function.process_params (/home/runner/workspace/node_modules/express/lib/router/index.js:346:12)
    at next (/home/runner/workspace/node_modules/express/lib/router/index.js:280:10)
    at /home/runner/workspace/node_modules/body-parser/lib/read.js:137:5
    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)
    at invokeCallback (/home/runner/workspace/node_modules/raw-body/index.js:238:16)
    at done (/home/runner/workspace/node_modules/raw-body/index.js:227:7)
    at IncomingMessage.onEnd (/home/runner/workspace/node_modules/raw-body/index.js:287:7)
    at IncomingMessage.emit (node:events:518:28)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)
12:43:30 AM [express] POST /api/packages 500 in 2ms :: {"message":"Internal server error"}

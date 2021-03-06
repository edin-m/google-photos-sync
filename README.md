# Google Photos Sync
Sync Google Photos on a local disk.

# THIS IS A READ-ONLY / DOWNLOAD SYNC

# Set up

1. Get credentials.json from google console and put them into the secrets folder
2. Set photo path in config.json (along with other params)
3. Run `node app`

# How it works



It has 3 cron jobs which are:
- getting and caching google photo metadata (4x a day)
- probing files for their content length - file change detection (every hour - a limited number of items)
- actually downloading files (every hour - a limited number of items)

# CLI commands

## start

It will load and set up jobs and that's it.

```js
$ node app
```

## output verbose logs

```js
$ node app -v
```

## count number of metadata items downloaded and stored

```js
$ node app -c
```

## run a specific job once and exit

```js
$ node app --job <job-name> --params <job-params-space-separated>
```

```js
$ node app --job probeMediaItemRefresh --params <<renewIfOlderThanDays>> <<numberOfItems>>

$ node app --job downloadMediaItemFile --params <<limitNumberOfItems>>

$ node app --job searchMediaItemsJob --params <<numOfDaysBack>> <<limitNumOfItems>>

$ node app --job appStartupJob
```

# TODO

[ ] resume download -- right now it overwrites if a file is partially downloaded

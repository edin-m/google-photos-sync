
module.exports = {
    GooglePhotosApi
};

class GooglePhotosApi {

    static listOfScopes() {
        return [
            'https://www.googleapis.com/auth/photoslibrary.readonly',
            'https://www.googleapis.com/auth/drive.appfolder'
        ];
    }

    static photosApiReadOnlyScope() {
        return 'https://www.googleapis.com/auth/photoslibrary.readonly';
    }

    // static headers(access_token) {
    //     return {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${access_token}`
    //     };
    // }

    // async listMediaItems(pageSize = 10, nextPageToken = null ) {
    //     const token = await this.googleOAuth2.getToken();
    //     const headers = GooglePhotosApi.headers(token.res.access_token);
    //
    //     const url = GooglePhotosApi.APIs.mediaItems + '?' +
    //         `${!!pageSize ? 'pageSize=' + pageSize : ''}` +
    //         `${!!nextPageToken ? 'pageToken=' + nextPageToken : ''}`;
    //
    //     console.log(url);
    //
    //     return new Promise((resolve, reject) => {
    //         request(url, { headers }, (err, resp, body) => {
    //             if (err) console.error(err);
    //             const mediaItems = JSON.parse(body);
    //             resolve(mediaItems);
    //         });
    //     });
    // }

    // async getSingleMediaItem(mediaItem) {
    //     // const token = await this.googleOAuth2.getToken();
    //     // const headers = GooglePhotosApi.headers(token.res.access_token);
    //
    //     const { width, height } = mediaItem.mediaMetadata;
    //
    //     const url = `${mediaItem.baseUrl}=w${width}-h${height}`;
    //     request(url).pipe(fs.createWriteStream(`./photos/${mediaItem.filename}`));
    // }
}
GooglePhotosApi.APIs = {
    mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems'
};

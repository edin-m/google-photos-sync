

const { AuthStorage, AuthService } = require('./google-auth');
const { GooglePhotosApi } = require('./google-photos');

async function main() {
    const authStorage = new AuthStorage();
    const authService = new AuthService(authStorage);

    const scopes = GooglePhotosApi.listOfScopes();
    const authToken = authService.authenticate(scopes);
}

main().catch(err => console.error(err));

// https://accounts.google.com/o/oauth2/v2/auth?scope=email%20profile&response_type=code&state=security_token%3D138r5719ru3e1%26url%3Dhttps://oauth2.example.com/token&redirect_uri=http://localhost:3001/oauth2redirect&client_id=268732907207-hjicm60291mpkqprcgocpb0cm99gfgss.apps.googleusercontent.com

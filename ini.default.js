module.exports = {
    port: 80,
    database: {
        projects: {
            model: 'json',
            file:'./data/projects',
            index:['id']
        },
        structure: {
            model: 'json',
            file:'./data/structure',
            index:['id']
        },
        floor: {
            model: 'json',
            file:'./data/floor',
            index:['id']
        },
        devices: {
            model: 'json',
            file:'./data/devices',
            index:['id']
        },
        langs: {
            model: 'json',
            file:'./data/langs',
            index:['label']
        }

    },
    databasex: {
        name: {
            model: 'mysql',
            host:'173.194.250.90',
            user:'cb',
            password:'cb',
            database:'cb',
            table:'name',
            index:['id']
        }
    }
}
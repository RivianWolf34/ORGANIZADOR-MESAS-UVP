// Base de datos de Profesores, Grupos y Alumnos

const BASE_DE_DATOS = {
    "Astrid": {
        hash: "d7f10092509bb26ff44027c42183fbd2aebb529f3fba8cd7599b1a3eed2da94f",
        grupos: {
            "Grupo A - Lunes": [
                "Diego García", "Nery Garcia", "Saúl Nava", "María Valle", 
                "Diego Lopez", "Mauricio Mendoza", "Mario Baltazar", "Pavel Vera", 
                "Juan Mendez", "Norma Rios", "María Orozco", "Romel Reyes", 
                "Jorge Cortes", "Emigdio Hernandez", "Oscar Galvez", "Alondra Antonio", 
                "Zuleica Lancho", "Jose Tellez", "Hania Astudillo", "Marcos Quintanar", 
                "Jordi Cruz"
            ],
            "Grupo B - Miércoles": []
        }
    },
    "Admin": {
        hash: "2ee62f16ca41fe7879853975d5fcb4cb858f6edb5fd0355cfb7948d997e6b6a9",
        grupos: {} // Dejado vacío intencionalmente porque Admin genera números del 1 al 50
    }
};
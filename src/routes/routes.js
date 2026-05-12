import { Router } from "express";
const routes = Router();

import clienteRoutes from "./clienteRoutes.js";

routes.use('/clientes', clienteRoutes);

export default routes;

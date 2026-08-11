# Seguridad

El proyecto no ejecuta Lua. El código se trata exclusivamente como texto para
generación, visualización y análisis estático.

No se aceptan cambios que agreguen `eval`, ejecución de shell, procesos
externos, carga dinámica de código o permisos de red sin revisión explícita.

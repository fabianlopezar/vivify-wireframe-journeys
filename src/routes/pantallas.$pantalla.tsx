import { createFileRoute } from '@tanstack/react-router';
import { WireframeApp, getScreenTitle, screenHead } from '@/features/wireframes/WireframeApp';
export const Route = createFileRoute('/pantallas/$pantalla')({head:({params})=>screenHead(getScreenTitle(params.pantalla)),component:ScreenPage});
function ScreenPage(){const {pantalla}=Route.useParams();return <WireframeApp key={pantalla} screen={pantalla}/>;}

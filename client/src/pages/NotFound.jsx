import { GLink, Heading, Text } from '../components/Grunge';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <Heading as="h1" size="h2">Page not found</Heading>
      <Text variant="xl" className="max-w-3xl text-paper">This page does not exist, or it has been moved.</Text>
      <GLink variant="button" to="/">Go back to the planner</GLink>
    </div>
  );
}

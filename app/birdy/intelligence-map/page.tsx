import Image from "next/image";

export default function BirdyIntelligenceMapPage() {
  return (
    <main className="min-h-screen bg-[#020508] p-0 text-white">
      <h1 className="sr-only">Birdy Intelligence Map</h1>

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#020508]">
          <Image
            src="/birdy/intelligence-map-reference.jpg"
            alt="Birdy Intelligence Map"
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>
      </div>
    </main>
  );
}

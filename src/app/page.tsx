import { CoinAscii } from "./coin-ascii";

export default function Home() {
  return (
    <main className="px-5 py-6">
      <h1 className="text-base font-medium">money-io</h1>
      <div className="mt-6 flex justify-center">
        <CoinAscii />
      </div>
    </main>
  );
}

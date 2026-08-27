import { DigestView } from "@/components/digest-view";
import { getStaticDates, getStaticDigest } from "@/lib/static-data";

export default function Home() {
  return <DigestView digest={getStaticDigest()} dates={getStaticDates()} />;
}

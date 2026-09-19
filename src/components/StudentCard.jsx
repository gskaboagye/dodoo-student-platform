export default function StudentCard({
  name,
  email,
  progress,
  status,
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
          {name.charAt(0)}
        </div>

        <div>
          <h3 className="font-bold text-gray-900">
            {name}
          </h3>

          <p className="text-sm text-gray-500">
            {email}
          </p>
        </div>
      </div>

      <div className="hidden text-right sm:block">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          {status}
        </span>

        <p className="mt-2 text-sm font-semibold text-gray-600">
          {progress}% progress
        </p>
      </div>
    </div>
  );
}
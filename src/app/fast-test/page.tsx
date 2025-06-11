export default function FastTestPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fast Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900">Performance Test</h2>
          <p className="text-blue-800 mt-2">
            This page has no heavy dependencies like Plotly.js. 
            It should load very quickly if Plotly is the performance bottleneck.
          </p>
        </div>
        
        <div className="bg-green-100 border border-green-300 rounded-lg p-4">
          <h2 className="font-semibold text-green-900">What This Tests</h2>
          <ul className="text-green-800 mt-2 space-y-1">
            <li>• Next.js app loading speed</li>
            <li>• Tailwind CSS processing</li>
            <li>• Google Fonts loading</li>
            <li>• Basic React rendering</li>
          </ul>
        </div>
        
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
          <h2 className="font-semibold text-yellow-900">Expected Result</h2>
          <p className="text-yellow-800 mt-2">
            If this page loads quickly but /test and /explore are slow, 
            then Plotly.js is definitely the performance bottleneck.
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium">Component 1</h3>
            <p className="text-sm text-gray-600 mt-1">Some sample content</p>
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium">Component 2</h3>
            <p className="text-sm text-gray-600 mt-1">Some sample content</p>
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium">Component 3</h3>
            <p className="text-sm text-gray-600 mt-1">Some sample content</p>
          </div>
        </div>
      </div>
    </div>
  );
}
